"""Bounded queue processing for scheduled runners; no persistent process required."""

import asyncio
import logging

from .config import settings
from .worker import tick

log = logging.getLogger("daybreak.batch")


async def run_batch(max_jobs=5):
    for _ in range(max_jobs):
        if not await tick():
            return


async def main():
    logging.basicConfig(level=logging.INFO)
    cfg = settings()
    if not cfg.supabase_url or not cfg.supabase_service_role_key:
        raise RuntimeError("Configure Supabase repository secrets before running the worker")
    try:
        await asyncio.wait_for(run_batch(), timeout=240)
    except TimeoutError:
        # Interrupted jobs remain durable and become claimable after lease expiration.
        log.warning("Batch time limit reached; remaining jobs will resume in a later run")
        raise SystemExit(1) from None


if __name__ == "__main__":
    asyncio.run(main())
