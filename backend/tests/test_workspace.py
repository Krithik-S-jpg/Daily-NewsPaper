from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app
from app.security import current_user

EDITION = "00000000-0000-4000-8000-000000000001"


def test_progress_requires_authentication():
    with TestClient(app) as client:
        assert client.get(f"/api/reading/{EDITION}?mode=phone").status_code == 401
        assert client.put(f"/api/reading/{EDITION}", json={"mode": "phone", "page": 2}).status_code == 401


def test_progress_is_owner_scoped_and_validated(monkeypatch):
    app.dependency_overrides[current_user] = lambda: {"id": "owner"}
    owned = AsyncMock(return_value=[])
    request = AsyncMock(return_value=[])
    monkeypatch.setattr("app.main.db.owned", owned)
    monkeypatch.setattr("app.main.db.request", request)
    try:
        with TestClient(app) as client:
            assert client.put(f"/api/reading/{EDITION}", json={"mode": "phone", "page": 2}).status_code == 404
            request.assert_not_called()
            owned.return_value = [{"id": EDITION}]
            assert (
                client.put(f"/api/reading/{EDITION}", json={"mode": "phone", "page": -1}).status_code == 422
            )
            assert client.put(f"/api/reading/{EDITION}", json={"mode": "phone", "page": 3}).status_code == 200
            assert request.call_args.kwargs["data"]["user_id"] == "owner"
            assert request.call_args.kwargs["data"]["page"] == 3
            assert all(call.args[1] == "owner" for call in owned.call_args_list)
    finally:
        app.dependency_overrides.clear()


def test_archive_pagination_is_scoped(monkeypatch):
    app.dependency_overrides[current_user] = lambda: {"id": "owner"}
    owned = AsyncMock(return_value=[{"content": {"id": str(i)}} for i in range(3)])
    monkeypatch.setattr("app.main.db.owned", owned)
    try:
        with TestClient(app) as client:
            result = client.get("/api/editions?offset=20&limit=2").json()
            assert len(result["editions"]) == 2 and result["next_offset"] == 22
            assert owned.call_args.args == ("editions", "owner")
            assert owned.call_args.kwargs["offset"] == "20"
            assert client.get("/api/editions?limit=1000").status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_readiness_reports_missing_database_without_secrets(monkeypatch):
    monkeypatch.setattr("app.main.settings", lambda: Settings(_env_file=None))
    with TestClient(app) as client:
        response = client.get("/health/ready")
        assert response.status_code == 503
        assert response.json()["database"] == "Not configured"
        assert "key" not in response.text.lower()
