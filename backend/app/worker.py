"""Run independently: python -m app.worker. PostgreSQL is the durable queue."""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import httpx

from .connectors import collect
from .db import db
from .delivery import reconcile_deliveries, send_edition
from .editorial import compose
from .models import Edition, Preferences
from .scheduling import next_run

log = logging.getLogger("daybreak.worker")


async def schedule_due():
    now = datetime.now(timezone.utc)
    due = await db.request(
        "GET", "delivery_preferences", params={"next_run_at": f"lte.{now.isoformat()}", "limit": "100"}
    )
    for pref in due:
        # Stable run key plus unique constraint makes concurrent scheduler ticks safe.
        following = next_run(now, pref["local_time"], pref["timezone"], pref["days"])
        await db.rpc(
            "enqueue_scheduled",
            {
                "p_user": pref["user_id"],
                "p_due": pref["next_run_at"],
                "p_next": following.isoformat() if following else None,
            },
        )


async def update_job(job, **data):
    return await db.request(
        "PATCH",
        "generation_jobs",
        params={
            "id": f"eq.{job['id']}",
            "lease_token": f"eq.{job['lease_token']}",
            "locked_until": f"gt.{datetime.now(timezone.utc).isoformat()}",
        },
        data=data,
    )


async def process(job):
    uid = job["user_id"]
    profiles = await db.owned("profiles", uid)
    prefs = Preferences.model_validate(profiles[0]["preferences"] if profiles else {})
    existing = await db.owned("editions", uid, id=f"eq.{job['edition_id']}")
    if existing:
        edition = existing[0]["content"]
    else:
        sources = await db.owned("connected_sources", uid, enabled="eq.true")
        items = []
        for source in sources:
            try:
                retrieved = await collect(source)
                items.extend(retrieved)
                if retrieved:
                    await db.request(
                        "POST",
                        "source_items",
                        params={"on_conflict": "source_id,content_hash"},
                        data=[
                            {
                                "user_id": uid,
                                "source_id": source["id"],
                                "content_hash": i.id,
                                "url": str(i.url),
                                "content": i.model_dump(mode="json"),
                            }
                            for i in retrieved
                        ],
                    )
                await db.request(
                    "PATCH",
                    "connected_sources",
                    params={"id": f"eq.{source['id']}"},
                    data={
                        "status": f"Retrieved {len(retrieved)} items",
                        "last_retrieved_at": datetime.now(timezone.utc).isoformat(),
                    },
                )
            except (ValueError, OSError, httpx.HTTPError):
                await db.request(
                    "PATCH",
                    "connected_sources",
                    params={"id": f"eq.{source['id']}"},
                    data={"status": "Retrieval failed; check access or try again"},
                )
        if not items:
            raise ValueError("No accessible content. Check your enabled sources.")
        await update_job(
            job,
            status="composing",
            locked_until=(datetime.now(timezone.utc) + timedelta(minutes=20)).isoformat(),
        )
        articles = await compose(items, prefs)
        edition = Edition(
            id=job["edition_id"], date=datetime.now(ZoneInfo(prefs.timezone)).date(), articles=articles
        ).model_dump(mode="json")
        await update_job(job, status="publishing")
        await db.rpc(
            "publish_edition",
            {
                "p_job": job["id"],
                "p_lease": job["lease_token"],
                "p_content": edition,
                "p_timezone": prefs.timezone,
            },
        )
    await send_edition(edition, uid, prefs.email, prefs.delivery_format)
    await update_job(
        job,
        status="completed",
        completed_at=datetime.now(timezone.utc).isoformat(),
        locked_until=None,
        error=None,
    )


async def tick():
    await schedule_due()
    try:
        await reconcile_deliveries()
    except httpx.HTTPError:
        log.warning("Delivery status provider is unavailable")
    jobs = await db.rpc("claim_job", {})
    if not jobs:
        return
    job = jobs[0]
    try:
        await run_leased(job)
    except Exception as exc:
        # Log exception type only: provider messages can contain credentials or source data.
        log.warning("Job %s failed: %s", job["id"], type(exc).__name__)
        final = job["attempts"] >= 3
        await update_job(
            job,
            status="failed" if final else "queued",
            locked_until=None,
            available_at=(
                datetime.now(timezone.utc) + timedelta(seconds=30 * 2 ** job["attempts"])
            ).isoformat(),
            error="Generation failed. Check source access and provider configuration."
            if final
            else "Retrying a temporary failure.",
        )


async def main():
    logging.basicConfig(level=logging.INFO)
    while True:
        try:
            await tick()
        except Exception as exc:
            log.warning("Worker tick failed: %s", type(exc).__name__)
        await asyncio.sleep(15)


async def run_leased(job):
    stop = asyncio.Event()

    async def run():
        try:
            await process(job)
        finally:
            stop.set()

    async def heartbeat():
        while not stop.is_set():
            try:
                await asyncio.wait_for(stop.wait(), timeout=60)
            except TimeoutError:
                renewed = await update_job(
                    job, locked_until=(datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
                )
                if not renewed:
                    raise RuntimeError("Job lease lost")

    async with asyncio.TaskGroup() as group:
        group.create_task(run())
        group.create_task(heartbeat())


if __name__ == "__main__":
    asyncio.run(main())
