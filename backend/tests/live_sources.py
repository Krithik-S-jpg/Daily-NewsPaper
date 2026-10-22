"""Explicit, opt-in public-network smoke check; never part of offline unit tests."""

import asyncio

from app.connectors import collect
from app.editorial import Extractive, compose
from app.models import Preferences


async def main():
    all_items = []
    for source in [
        {"id": "nasa", "name": "NASA", "kind": "rss", "url": "https://www.nasa.gov/feed/"},
        {"id": "next", "name": "Next.js", "kind": "github", "url": "https://github.com/vercel/next.js"},
    ]:
        items = await collect(source)
        assert items and all(i.url and i.headline for i in items)
        all_items.extend(items)
        print(f"{source['name']}: retrieved {len(items)} attributed items")
    articles = await compose(all_items, Preferences(), Extractive())
    assert articles and all(any(a.url == i.url for i in all_items) for a in articles)
    print(f"Composed {len(articles)} source-excerpt stories; every URL retained")


if __name__ == "__main__":
    asyncio.run(main())
