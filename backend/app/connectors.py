import hashlib
import html
import ipaddress
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit

import feedparser
import httpx
from pydantic import HttpUrl

from .config import settings
from .models import Item, SourceInput
from .security import safe_fetch


def clean(value):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", " ", value or ""))).strip()


def canonical(url):
    u = urlsplit(url)
    if u.scheme not in ("http", "https") or not u.hostname or u.username or u.password:
        raise ValueError("Invalid article URL")
    query = [
        (k, v) for k, v in parse_qsl(u.query) if not k.startswith("utm_") and k not in ("fbclid", "gclid")
    ]
    return urlunsplit((u.scheme, u.netloc.lower(), u.path.rstrip("/") or "/", urlencode(sorted(query)), ""))


def item(source, title, description, url, published=None):
    url = canonical(url)
    return Item(
        id=hashlib.sha256(url.encode()).hexdigest()[:24],
        headline=clean(title)[:500],
        summary=clean(description)[:12000],
        source=source["name"],
        source_id=source.get("id", ""),
        url=url,
        published_at=published,
    )


class FeedImages(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "img" and attrs.get("src"):
            if attrs.get("width") in ("0", "1") or attrs.get("height") in ("0", "1"):
                return
            self.images.append((attrs["src"], attrs.get("alt", "")))


def feed_image(entry, article_url, source_name):
    """Only use media attached to this feed entry, never feed logos or stock substitutes."""
    candidates = []
    for media in entry.get("media_content", []):
        if media.get("medium") == "image" or media.get("type", "").startswith("image/"):
            candidates.append((media.get("url", ""), ""))
    candidates.extend((m.get("url", ""), "") for m in entry.get("media_thumbnail", []))
    candidates.extend(
        (m.get("href", ""), "") for m in entry.get("enclosures", []) if m.get("type", "").startswith("image/")
    )
    parser = FeedImages()
    for content in [entry.get("summary", "")] + [c.get("value", "") for c in entry.get("content", [])]:
        parser.feed(content)
    candidates.extend(parser.images)
    credit = clean("; ".join(c.get("content", "") for c in entry.get("media_credit", [])))[:300]
    for raw, caption in candidates:
        if not raw:
            continue
        url = urljoin(article_url, html.unescape(raw))
        try:
            parsed = urlsplit(url)
            host = (parsed.hostname or "").lower()
            if (
                parsed.scheme != "https"
                or not host
                or parsed.username
                or parsed.password
                or parsed.port not in (None, 443)
                or len(url) > 2048
                or "." not in host
                or host.endswith((".local", ".localhost", ".internal"))
            ):
                continue
            try:
                if not ipaddress.ip_address(host).is_global:
                    continue
            except ValueError:
                pass
        except ValueError:
            continue
        attribution = credit or f"Image supplied by {source_name}"
        return url, f"{clean(caption)[:300]} · {attribution}" if caption else attribution
    return None, None


def normalize_feed(data, source):
    parsed = feedparser.parse(data)
    if not parsed.entries:
        raise ValueError("No accessible articles were found in this RSS/Atom feed.")
    items = []
    for entry in parsed.entries[:60]:
        try:
            stamp = entry.get("published_parsed") or entry.get("updated_parsed")
            published = datetime(*stamp[:6], tzinfo=timezone.utc) if stamp else None
            value = item(source, entry.get("title", ""), entry.get("summary", ""), entry.link, published)
            image, caption = feed_image(entry, str(value.url), source["name"])
            value.image = HttpUrl(image) if image else None
            value.image_caption = caption
            items.append(value)
        except (ValueError, AttributeError):
            continue
    return items


def validate_source(source: SourceInput):
    if source.kind == "github":
        u = urlsplit(source.url)
        if (
            u.scheme != "https"
            or u.hostname != "github.com"
            or not re.fullmatch(r"/[\w.-]+/[\w.-]+/?", u.path)
            or u.query
            or u.username
        ):
            raise ValueError("Use a public repository URL: https://github.com/owner/repository")
    elif source.kind == "youtube":
        if not re.fullmatch(r"UC[\w-]{22}", source.url):
            raise ValueError("Use a YouTube channel ID beginning with UC.")
        if not settings().youtube_api_key:
            raise ValueError("YouTube requires a configured server API key.")
    elif source.kind == "reddit":
        if not re.fullmatch(r"[A-Za-z0-9_]{2,21}", source.url):
            raise ValueError("Enter a subreddit name without r/.")
        if not settings().reddit_access_token:
            raise ValueError("Reddit requires approved API access and a configured server token.")
    elif not source.url.startswith("https://"):
        raise ValueError("RSS feeds must use HTTPS.")


async def collect(source):
    cfg = settings()
    kind = source["kind"]
    if kind == "rss":
        return normalize_feed(await safe_fetch(source["url"]), source)
    async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
        if kind == "github":
            repo = urlsplit(source["url"]).path.strip("/")
            headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
            if cfg.github_token:
                headers["Authorization"] = f"Bearer {cfg.github_token}"
            response = await client.get(
                f"https://api.github.com/repos/{repo}/releases", headers=headers, params={"per_page": 20}
            )
            response.raise_for_status()
            return [
                item(
                    source,
                    r["name"] or r["tag_name"],
                    r.get("body", ""),
                    r["html_url"],
                    r.get("published_at"),
                )
                for r in response.json()
                if not r.get("draft")
            ]
        if kind == "youtube":
            response = await client.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "channelId": source["url"],
                    "type": "video",
                    "order": "date",
                    "maxResults": 15,
                    "key": cfg.youtube_api_key,
                },
            )
            response.raise_for_status()
            return [
                item(
                    source,
                    r["snippet"]["title"],
                    r["snippet"]["description"],
                    f"https://www.youtube.com/watch?v={r['id']['videoId']}",
                    r["snippet"]["publishedAt"],
                )
                for r in response.json()["items"]
            ]
        if kind == "reddit":
            response = await client.get(
                f"https://oauth.reddit.com/r/{source['url']}/new",
                params={"limit": 20},
                headers={
                    "Authorization": f"Bearer {cfg.reddit_access_token}",
                    "User-Agent": "Daybreak/0.1 personal reader",
                },
            )
            response.raise_for_status()
            return [
                item(
                    source,
                    r["data"]["title"],
                    r["data"].get("selftext", ""),
                    "https://www.reddit.com" + r["data"]["permalink"],
                    datetime.fromtimestamp(r["data"]["created_utc"], timezone.utc),
                )
                for r in response.json()["data"]["children"]
                if not r["data"].get("over_18")
            ]
    raise ValueError("Unsupported source type")
