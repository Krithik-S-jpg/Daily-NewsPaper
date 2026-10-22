import asyncio
import http.client
import ipaddress
import socket
import ssl
from urllib.parse import urljoin, urlsplit

import httpx
from fastapi import Header, HTTPException

from .config import settings


async def current_user(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Sign in to continue.")
    cfg = settings()
    if not cfg.supabase_url or not cfg.supabase_anon_key:
        raise HTTPException(503, "Supabase is not configured.")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{cfg.supabase_url}/auth/v1/user",
                headers={"apikey": cfg.supabase_anon_key, "Authorization": authorization},
            )
        if response.status_code != 200:
            raise HTTPException(401, "Your session expired. Please sign in again.")
        user = response.json()
        if not user.get("id") or not user.get("email_confirmed_at"):
            raise HTTPException(403, "Verify your email before generating an edition.")
        return user
    except httpx.RequestError as exc:
        raise HTTPException(503, "Authentication service is unavailable.") from exc


def public_addresses(host, port):
    records = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    addresses = list(dict.fromkeys(r[4][0] for r in records))
    if not addresses or any(
        not ipaddress.ip_address(a).is_global
        or ipaddress.ip_address(a).is_multicast
        or ipaddress.ip_address(a).is_reserved
        for a in addresses
    ):
        raise ValueError("Source must resolve only to public internet addresses.")
    return addresses


def safe_fetch_sync(url: str, redirects=0) -> bytes:
    """Resolve, validate, and PIN the socket to that IP to prevent DNS rebinding."""
    u = urlsplit(url)
    if u.scheme != "https" or not u.hostname or u.username or u.password or u.port not in (None, 443):
        raise ValueError("Use an HTTPS source URL on port 443 without credentials.")
    addresses = public_addresses(u.hostname, 443)
    conn = http.client.HTTPSConnection(u.hostname, timeout=12)
    raw = socket.create_connection((addresses[0], 443), timeout=12)
    try:
        conn.sock = ssl.create_default_context().wrap_socket(raw, server_hostname=u.hostname)
        path = u.path or "/"
        if u.query:
            path += "?" + u.query
        conn.request(
            "GET",
            path,
            headers={
                "User-Agent": "Daybreak/0.1 (personal feed reader)",
                "Accept": "application/atom+xml,application/rss+xml,application/xml,text/xml",
            },
        )
        response = conn.getresponse()
        if response.status in (301, 302, 303, 307, 308):
            if redirects >= 3:
                raise ValueError("Source redirected too many times.")
            return safe_fetch_sync(urljoin(url, response.getheader("Location", "")), redirects + 1)
        if response.status != 200:
            raise ValueError(f"Source returned HTTP {response.status}.")
        data = response.read(2_000_001)
        if len(data) > 2_000_000:
            raise ValueError("Feed exceeds the 2 MB limit.")
        return data
    finally:
        conn.close()
        raw.close()


async def safe_fetch(url):
    return await asyncio.to_thread(safe_fetch_sync, url)
