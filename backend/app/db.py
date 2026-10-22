import httpx

from .config import settings


class Database:
    """Server-only repository. Every user-facing query adds a verified owner filter."""

    async def request(self, method, table, *, params=None, data=None):
        cfg = settings()
        if not cfg.supabase_url or not cfg.supabase_service_role_key:
            raise RuntimeError("Configure Supabase before using private features.")
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.request(
                method,
                f"{cfg.supabase_url}/rest/v1/{table}",
                params=params,
                json=data,
                headers={
                    "apikey": cfg.supabase_service_role_key,
                    "Authorization": f"Bearer {cfg.supabase_service_role_key}",
                    "Prefer": "return=representation,resolution=merge-duplicates",
                },
            )
        response.raise_for_status()
        return response.json() if response.content else None

    async def owned(self, table, user_id, **filters):
        return await self.request("GET", table, params={"user_id": f"eq.{user_id}", **filters})

    async def rpc(self, name, data):
        return await self.request("POST", f"rpc/{name}", data=data)


db = Database()
