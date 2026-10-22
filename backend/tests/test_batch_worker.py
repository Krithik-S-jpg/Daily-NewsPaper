from unittest.mock import AsyncMock

import pytest

from app import batch_worker


@pytest.mark.asyncio
async def test_empty_queue_exits(monkeypatch):
    tick = AsyncMock(return_value=False)
    monkeypatch.setattr(batch_worker, "tick", tick)
    await batch_worker.run_batch()
    assert tick.await_count == 1


@pytest.mark.asyncio
async def test_batch_limits_claims(monkeypatch):
    tick = AsyncMock(return_value=True)
    monkeypatch.setattr(batch_worker, "tick", tick)
    await batch_worker.run_batch(max_jobs=3)
    assert tick.await_count == 3


@pytest.mark.asyncio
async def test_queue_failure_is_visible(monkeypatch):
    monkeypatch.setattr(batch_worker, "tick", AsyncMock(side_effect=RuntimeError("offline")))
    with pytest.raises(RuntimeError, match="offline"):
        await batch_worker.run_batch()
