import base64
import html
from datetime import datetime, timedelta, timezone

import httpx

from .config import settings
from .db import db
from .pdf import render_pdf


async def send_edition(edition, user_id, enabled, delivery_format="link"):
    cfg = settings()
    records = await db.owned("delivery_logs", user_id, edition_id=f"eq.{edition['id']}")
    if not records or records[0]["status"] in ("accepted", "delivered", "disabled", "failed"):
        return
    record = records[0]
    if record.get("attempts", 0) and datetime.now(timezone.utc) - datetime.fromisoformat(
        record["created_at"]
    ) > timedelta(hours=23):
        # Provider idempotency has a finite retention window; don't risk a duplicate.
        await db.request(
            "PATCH", "delivery_logs", params={"id": f"eq.{record['id']}"}, data={"status": "failed"}
        )
        return
    status = (
        "disabled"
        if not enabled
        else "unconfigured"
        if not cfg.resend_api_key or not cfg.email_from
        else None
    )
    if status:
        await db.request(
            "PATCH", "delivery_logs", params={"id": f"eq.{record['id']}"}, data={"status": status}
        )
        return
    await db.request(
        "PATCH",
        "delivery_logs",
        params={"id": f"eq.{record['id']}"},
        data={"attempts": record["attempts"] + 1},
    )
    async with httpx.AsyncClient(timeout=20) as client:
        account = await client.get(
            f"{cfg.supabase_url}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": cfg.supabase_service_role_key,
                "Authorization": f"Bearer {cfg.supabase_service_role_key}",
            },
        )
        account.raise_for_status()
        recipient = account.json()["email"]
        headlines = "".join(
            f'<li style="margin:12px 0">{html.escape(a["headline"])}</li>' for a in edition["articles"][:3]
        )
        # URL contains an edition ID, not a bearer credential; sign-in and ownership required.
        link = f"{cfg.frontend_url}/?edition={edition['id']}"
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {cfg.resend_api_key}",
                "Idempotency-Key": f"daybreak/{edition['id']}",
            },
            json={
                "from": cfg.email_from,
                "to": [recipient],
                "subject": f"Your Daybreak · {edition['date']}",
                "html": f'<main style="background:#f8f5eb;padding:40px;color:#30392a;font-family:Georgia"><h1 style="font-size:44px">Daybreak.</h1><p>Good morning, reader.</p><ul>{headlines}</ul><p><a href="{html.escape(link, quote=True)}">Open your private edition</a></p><p>Manage or disable email delivery in Settings in your reading room.</p></main>',
                **(
                    {
                        "attachments": [
                            {
                                "filename": f"daybreak-{edition['date']}.pdf",
                                "content": base64.b64encode(render_pdf(edition)).decode(),
                            }
                        ]
                    }
                    if delivery_format in ("pdf", "both")
                    else {}
                ),
            },
        )
        response.raise_for_status()
        message_id = response.json()["id"]
    await db.request(
        "PATCH",
        "delivery_logs",
        params={"id": f"eq.{record['id']}"},
        data={"status": "accepted", "provider_message_id": message_id, "attempts": record["attempts"] + 1},
    )


async def reconcile_deliveries():
    """Read provider status; an attempted/accepted send is never called delivered."""
    cfg = settings()
    if not cfg.resend_api_key:
        return
    records = await db.request("GET", "delivery_logs", params={"status": "eq.accepted", "limit": "20"})
    async with httpx.AsyncClient(timeout=15) as client:
        for record in records:
            if not record.get("provider_message_id"):
                continue
            response = await client.get(
                f"https://api.resend.com/emails/{record['provider_message_id']}",
                headers={"Authorization": f"Bearer {cfg.resend_api_key}"},
            )
            if not response.is_success:
                continue
            event = response.json().get("last_event")
            status = (
                "delivered"
                if event in ("delivered", "opened", "clicked")
                else "failed"
                if event in ("bounced", "failed", "suppressed", "complained")
                else None
            )
            if status:
                await db.request(
                    "PATCH", "delivery_logs", params={"id": f"eq.{record['id']}"}, data={"status": status}
                )
