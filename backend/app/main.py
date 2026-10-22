from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .connectors import collect, validate_source
from .db import db
from .models import Preferences, ReadingPosition, SourceInput, SourcePatch
from .pdf import render_pdf
from .scheduling import next_run
from .security import current_user

app = FastAPI(title="Daybreak", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings().frontend_url],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def private_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.exception_handler(httpx.HTTPError)
async def upstream_error(request, exc):
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=503,
        content={"detail": "A connected service is unavailable. Check server configuration and try again."},
    )


@app.get("/health")
async def health():
    return {"status": "ok", "database_configured": bool(settings().supabase_url)}


@app.get("/api/me")
async def me(user=Depends(current_user)):
    uid = user["id"]
    profiles = await db.owned("profiles", uid)
    profile = profiles[0] if profiles else {"preferences": Preferences().model_dump(), "onboarded": False}
    editions = await db.owned("editions", uid, order="created_at.desc", limit="100")
    jobs = await db.owned(
        "generation_jobs", uid, order="created_at.desc", limit="1", select="id,status,error"
    )
    delivery = await db.owned("delivery_logs", uid, order="created_at.desc", limit="1", select="status")
    schedule = await db.owned("delivery_preferences", uid, select="next_run_at")
    return {
        **profile,
        "sources": await db.owned("connected_sources", uid),
        "editions": [e["content"] for e in editions],
        "bookmarks": [b["article_id"] for b in await db.owned("user_bookmarks", uid)],
        "latest_job": jobs[0] if jobs else None,
        "delivery_status": delivery[0]["status"] if delivery else "No delivery yet",
        "next_run_at": schedule[0]["next_run_at"] if schedule else None,
    }


@app.get("/health/ready")
async def readiness(response: Response):
    cfg = settings()
    configured = bool(cfg.supabase_url and cfg.supabase_service_role_key)
    database = "Not configured"
    if configured:
        try:
            await db.request("GET", "reading_progress", params={"select": "edition_id", "limit": "1"})
            database = "Connected"
        except (httpx.HTTPError, RuntimeError):
            database = "Unavailable · check migrations and keys"
    if database != "Connected":
        response.status_code = 503
    return {
        "database": database,
        "auth": bool(cfg.supabase_url and cfg.supabase_anon_key),
        "ai": bool(cfg.ai_api_key and cfg.ai_model),
        "email": bool(cfg.resend_api_key and cfg.email_from),
    }


@app.get("/api/editions")
async def edition_list(
    offset: int = Query(0, ge=0, le=1000000), limit: int = Query(20, ge=1, le=100), user=Depends(current_user)
):
    rows = await db.owned(
        "editions",
        user["id"],
        order="created_at.desc,id.desc",
        offset=str(offset),
        limit=str(limit + 1),
        select="content",
    )
    return {
        "editions": [row["content"] for row in rows[:limit]],
        "next_offset": offset + limit if len(rows) > limit else None,
    }


@app.get("/api/reading/{edition_id}")
async def reading_get(edition_id: UUID, mode: Literal["phone", "spread"], user=Depends(current_user)):
    if not await db.owned("editions", user["id"], id=f"eq.{edition_id}", select="id"):
        raise HTTPException(404, "Edition not found.")
    rows = await db.owned("reading_progress", user["id"], edition_id=f"eq.{edition_id}", mode=f"eq.{mode}")
    return {"page": rows[0]["page"] if rows else None}


@app.put("/api/reading/{edition_id}")
async def reading_save(edition_id: UUID, position: ReadingPosition, user=Depends(current_user)):
    if not await db.owned("editions", user["id"], id=f"eq.{edition_id}", select="id"):
        raise HTTPException(404, "Edition not found.")
    await db.request(
        "POST",
        "reading_progress",
        params={"on_conflict": "user_id,edition_id,mode"},
        data={
            "user_id": user["id"],
            "edition_id": str(edition_id),
            **position.model_dump(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    return {"saved": True}


@app.put("/api/preferences")
async def preferences(prefs: Preferences, user=Depends(current_user)):
    uid = user["id"]
    run = next_run(datetime.now(timezone.utc), prefs.time, prefs.timezone, prefs.days)
    await db.rpc(
        "save_preferences",
        {"p_user": uid, "p_preferences": prefs.model_dump(), "p_next": run.isoformat() if run else None},
    )
    return {"saved": True, "next_run_at": run}


@app.post("/api/sources")
async def source_add(source: SourceInput, user=Depends(current_user)):
    if not await db.rpc(
        "consume_budget", {"p_user": user["id"], "p_operation": "source-validation", "p_limit": 10}
    ):
        raise HTTPException(429, "Too many source checks. Try again in a minute.")
    if len(await db.owned("connected_sources", user["id"])) >= 30:
        raise HTTPException(400, "Up to 30 sources are supported per account.")
    try:
        validate_source(source)
        # Test accessibility before persisting; never claim an untested connection.
        await collect(source.model_dump())
    except (ValueError, OSError, httpx.HTTPError) as exc:
        raise HTTPException(
            400, str(exc) if isinstance(exc, ValueError) else "Source is unavailable or access was denied."
        ) from exc
    return await db.request(
        "POST",
        "connected_sources",
        params={"on_conflict": "user_id,kind,url"},
        data={"user_id": user["id"], **source.model_dump(), "status": "Connected"},
    )


@app.patch("/api/sources/{source_id}")
async def source_update(source_id: UUID, patch: SourcePatch, user=Depends(current_user)):
    return await db.request(
        "PATCH",
        "connected_sources",
        params={"id": f"eq.{source_id}", "user_id": f"eq.{user['id']}"},
        data=patch.model_dump(),
    )


@app.delete("/api/sources/{source_id}", status_code=204)
async def source_delete(source_id: UUID, user=Depends(current_user)):
    await db.request(
        "DELETE", "connected_sources", params={"id": f"eq.{source_id}", "user_id": f"eq.{user['id']}"}
    )


@app.post("/api/generate")
async def generate(user=Depends(current_user)):
    if not await db.owned("connected_sources", user["id"], enabled="eq.true"):
        raise HTTPException(400, "Add at least one enabled source in Following first.")
    try:
        return await db.rpc("enqueue_manual", {"p_user": user["id"]})
    except httpx.HTTPStatusError as exc:
        if "five minutes" in exc.response.text:
            raise HTTPException(429, "Please wait five minutes between editions.") from exc
        raise


@app.get("/api/jobs/{job_id}")
async def job_status(job_id: UUID, user=Depends(current_user)):
    records = await db.owned(
        "generation_jobs", user["id"], id=f"eq.{job_id}", select="id,status,error,attempts"
    )
    if not records:
        raise HTTPException(404, "Job not found.")
    return records[0]


@app.post("/api/bookmarks/{article_id}")
async def bookmark(article_id: UUID, user=Depends(current_user)):
    if not await db.owned("articles", user["id"], id=f"eq.{article_id}"):
        raise HTTPException(404, "Story not found.")
    await db.request("POST", "user_bookmarks", data={"user_id": user["id"], "article_id": str(article_id)})
    return {"saved": True}


@app.delete("/api/bookmarks/{article_id}", status_code=204)
async def remove_bookmark(article_id: UUID, user=Depends(current_user)):
    await db.request(
        "DELETE", "user_bookmarks", params={"user_id": f"eq.{user['id']}", "article_id": f"eq.{article_id}"}
    )


@app.get("/api/editions/{edition_id}/pdf")
async def pdf(edition_id: UUID, user=Depends(current_user)):
    rows = await db.owned("editions", user["id"], id=f"eq.{edition_id}")
    if not rows:
        raise HTTPException(404, "Edition not found.")
    if not await db.rpc("consume_budget", {"p_user": user["id"], "p_operation": "pdf", "p_limit": 20}):
        raise HTTPException(429, "Too many PDF requests. Try again in a minute.")
    return Response(
        render_pdf(rows[0]["content"]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="daybreak-{rows[0]["date"]}.pdf"'},
    )


@app.get("/api/editions/{edition_id}")
async def get_edition(edition_id: UUID, user=Depends(current_user)):
    rows = await db.owned("editions", user["id"], id=f"eq.{edition_id}")
    if not rows:
        raise HTTPException(404, "Edition not found.")
    return rows[0]["content"]


@app.delete("/api/me", status_code=204)
async def delete_account(user=Depends(current_user)):
    cfg = settings()
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.delete(
            f"{cfg.supabase_url}/auth/v1/admin/users/{user['id']}",
            headers={
                "apikey": cfg.supabase_service_role_key,
                "Authorization": f"Bearer {cfg.supabase_service_role_key}",
            },
        )
    response.raise_for_status()
