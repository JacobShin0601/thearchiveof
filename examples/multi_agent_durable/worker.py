from __future__ import annotations

from .models import ChildResult, Run, Status
from .store import RunStore


async def complete_child(store: RunStore, child: Run, attempt_id, result: ChildResult) -> bool:
    """Fence stale workers: only the currently-owned attempt may commit a result."""
    async with store.transaction():
        if child.active_attempt_id != attempt_id or child.status in {Status.SUCCEEDED, Status.PARTIAL, Status.FAILED, Status.CANCELLED}:
            return False
        child.result = result.model_copy(update={"accepted_attempt_id": attempt_id})
        child.status = result.status
        child.actual_tokens = min(child.reserved_tokens, 42)
        store.append_outbox_once("child_terminal", child, suffix=str(attempt_id))
        return True
