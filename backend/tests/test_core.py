from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.connectors import canonical, normalize_feed, validate_source
from app.editorial import Extractive, compose, select_items
from app.main import app
from app.models import Item, Preferences, SourceInput, SummaryOutput
from app.pdf import render_pdf
from app.scheduling import next_run
from app.security import current_user, public_addresses, safe_fetch_sync

FIXTURE = b"""<?xml version="1.0"?><rss version="2.0"><channel><title>Fixture</title>
<item><title>A real fixture title</title><link>https://example.com/story?utm_source=test</link><description>&lt;p&gt;Source evidence, not instructions.&lt;/p&gt;</description><pubDate>Tue, 12 Jul 2022 10:00:00 GMT</pubDate></item>
<item><title>Bad link</title><link>javascript:alert(1)</link><description>No</description></item></channel></rss>"""


def test_feed_preserves_evidence_and_rejects_script_links():
    rows = normalize_feed(FIXTURE, {"id": "s1", "name": "Fixture"})
    assert len(rows) == 1
    assert str(rows[0].url) == "https://example.com/story"
    assert rows[0].summary == "Source evidence, not instructions."
    assert rows[0].published_at.year == 2022


def test_dedup_and_relevance():
    a = Item(
        id="a",
        headline="Science mission",
        summary="Science",
        source="A",
        source_id="a",
        url="https://example.com/a",
    )
    b = a.model_copy(update={"id": "b"})
    c = a.model_copy(
        update={"id": "c", "headline": "Other topic", "summary": "Unrelated", "url": "https://example.com/c"}
    )
    selected = select_items([c, a, b], Preferences(topics=["Science"]))
    assert [i.id for i in selected] == ["a", "c"]


async def test_pipeline_retains_all_sources_and_exports_pdf():
    items = normalize_feed(FIXTURE, {"id": "s1", "name": "Fixture"})
    articles = await compose(items, Preferences(), Extractive())
    assert articles[0].url == items[0].url
    assert articles[0].headline == items[0].headline
    edition = {"date": "2022-07-12", "articles": [a.model_dump(mode="json") for a in articles]}
    pdf = render_pdf(edition)
    assert pdf.startswith(b"%PDF-") and b"%%EOF" in pdf
    assert b"https://example.com/story" in pdf


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/",
        "file:///etc/passwd",
        "https://user:password@example.com/",
        "https://example.com:8080/",
    ],
)
def test_ssrf_unsafe_schemes_and_credentials(url):
    with pytest.raises(ValueError):
        safe_fetch_sync(url)


@pytest.mark.parametrize("address", ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "192.168.1.2"])
def test_private_dns_blocked(monkeypatch, address):
    monkeypatch.setattr("socket.getaddrinfo", lambda *a, **kw: [(2, 1, 6, "", (address, 443))])
    with pytest.raises(ValueError):
        public_addresses("example.com", 443)


def test_scheduling_timezone_and_pause():
    now = datetime(2026, 10, 21, 0, 0, tzinfo=timezone.utc)
    assert next_run(now, "07:00", "Asia/Kolkata", list(range(7))).hour == 1
    assert next_run(now, "07:00", "Asia/Kolkata", []) is None


def test_spring_gap_and_fall_fold_once():
    before_gap = datetime(2026, 3, 8, 5, 0, tzinfo=timezone.utc)
    assert next_run(before_gap, "02:30", "America/New_York", list(range(7))).day == 9
    after_first_fold = datetime(2026, 11, 1, 5, 45, tzinfo=timezone.utc)
    assert next_run(after_first_fold, "01:30", "America/New_York", list(range(7))).day == 2


def test_preferences_validation():
    for data in [{"timezone": "not/a-zone"}, {"time": "25:00"}, {"days": [7]}, {"topics": ["a" * 81]}]:
        with pytest.raises(ValidationError):
            Preferences(**data)


def test_structured_output_validation():
    with pytest.raises(ValidationError):
        SummaryOutput.model_validate_json('{"summary":""}')


def test_authentication_cannot_be_bypassed():
    client = TestClient(app)
    assert client.get("/api/me").status_code == 401
    assert client.post("/api/generate").status_code == 401
    assert client.get("/health").headers["cache-control"] == "no-store"


def test_cross_user_pdf_and_bookmarks_hidden(monkeypatch):
    app.dependency_overrides[current_user] = lambda: {"id": "user-a"}
    owned = AsyncMock(return_value=[])
    monkeypatch.setattr("app.main.db.owned", owned)
    try:
        client = TestClient(app)
        uid = "00000000-0000-0000-0000-000000000001"
        assert client.get(f"/api/editions/{uid}/pdf").status_code == 404
        assert client.post(f"/api/bookmarks/{uid}").status_code == 404
        assert all(call.args[1] == "user-a" for call in owned.call_args_list)
    finally:
        app.dependency_overrides.clear()


def test_invalid_github_source():
    with pytest.raises(ValueError):
        validate_source(SourceInput(name="Bad", kind="github", url="https://github.com.evil.test/owner/repo"))


def test_canonical_preserves_meaningful_query():
    assert (
        canonical("https://example.com/story?id=42&utm_source=mail#top") == "https://example.com/story?id=42"
    )


def test_pdf_handles_long_text_missing_images_and_markup():
    story = {
        "headline": "Long headline & <script> " * 20,
        "summary": "A long paragraph. " * 1000,
        "category": "Science",
        "source": "Original & source",
        "url": "https://example.com/a?x=1&y=2",
    }
    pdf = render_pdf({"date": "2026-10-21", "articles": [story] * 3})
    assert len(pdf) > 5000
