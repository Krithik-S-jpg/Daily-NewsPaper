from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest

from app import delivery, worker


async def test_retry_reopens_published_edition_without_recomposing(monkeypatch):
    edition = {"id": "edition-1", "date": "2026-10-21", "articles": []}
    owned = AsyncMock(side_effect=[[], [{"content": edition}]])
    monkeypatch.setattr(worker.db, "owned", owned)
    compose = AsyncMock()
    monkeypatch.setattr(worker, "compose", compose)
    send = AsyncMock()
    monkeypatch.setattr(worker, "send_edition", send)
    update = AsyncMock()
    monkeypatch.setattr(worker, "update_job", update)
    await worker.process(
        {"user_id": "user-a", "edition_id": "edition-1", "id": "job-1", "lease_token": "lease-1"}
    )
    compose.assert_not_called()
    assert send.call_args.args[0] is edition
    assert update.call_args.kwargs["status"] == "completed"


@pytest.mark.parametrize("attempts,status", [(1, "queued"), (3, "failed")])
async def test_worker_bounded_retries(monkeypatch, attempts, status):
    monkeypatch.setattr(worker, "schedule_due", AsyncMock())
    monkeypatch.setattr(worker, "reconcile_deliveries", AsyncMock())
    monkeypatch.setattr(worker.db, "rpc", AsyncMock(return_value=[{"id": "j", "attempts": attempts}]))
    monkeypatch.setattr(worker, "process", AsyncMock(side_effect=ValueError("private provider detail")))
    update = AsyncMock()
    monkeypatch.setattr(worker, "update_job", update)
    await worker.tick()
    assert update.call_args.kwargs["status"] == status
    assert "private" not in update.call_args.kwargs["error"]


async def test_email_already_accepted_is_not_sent_twice(monkeypatch):
    monkeypatch.setattr(delivery.db, "owned", AsyncMock(return_value=[{"status": "accepted"}]))
    request = AsyncMock()
    monkeypatch.setattr(delivery.db, "request", request)
    await delivery.send_edition({"id": "edition-1"}, "user-a", True)
    request.assert_not_called()


async def test_mock_provider_acceptance_and_pdf_attachment(monkeypatch):
    record = {
        "id": "log-1",
        "status": "pending",
        "attempts": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    monkeypatch.setattr(delivery.db, "owned", AsyncMock(return_value=[record]))
    write = AsyncMock()
    monkeypatch.setattr(delivery.db, "request", write)
    monkeypatch.setattr(
        delivery,
        "settings",
        lambda: SimpleNamespace(
            resend_api_key="test-key",
            email_from="test@example.com",
            supabase_url="https://example.supabase.co",
            supabase_service_role_key="test-service",
            frontend_url="https://daybreak.example",
        ),
    )
    calls = []

    def handle(request):
        calls.append(request)
        return httpx.Response(
            200, json={"email": "reader@example.com"} if request.method == "GET" else {"id": "message-1"}
        )

    original = httpx.AsyncClient
    monkeypatch.setattr(
        delivery.httpx, "AsyncClient", lambda **kw: original(transport=httpx.MockTransport(handle))
    )
    await delivery.send_edition(
        {"id": "edition-1", "date": "2026-10-21", "articles": []}, "user-a", True, "both"
    )
    assert calls[1].headers["Idempotency-Key"] == "daybreak/edition-1"
    assert b"attachments" in calls[1].content
    assert write.call_args.kwargs["data"]["status"] == "accepted"


async def test_delivered_only_after_provider_confirmation(monkeypatch):
    monkeypatch.setattr(delivery, "settings", lambda: SimpleNamespace(resend_api_key="test"))
    write = AsyncMock(side_effect=[[{"id": "log", "provider_message_id": "message"}], None])
    monkeypatch.setattr(delivery.db, "request", write)
    original = httpx.AsyncClient
    monkeypatch.setattr(
        delivery.httpx,
        "AsyncClient",
        lambda **kw: original(
            transport=httpx.MockTransport(lambda r: httpx.Response(200, json={"last_event": "delivered"}))
        ),
    )
    await delivery.reconcile_deliveries()
    assert write.call_args.kwargs["data"] == {"status": "delivered"}
