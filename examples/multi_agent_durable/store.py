from __future__ import annotations

import asyncio
from collections import defaultdict
from contextlib import asynccontextmanager
from dataclasses import replace
from uuid import UUID, uuid4

from .models import OutboxEvent, Run, Status, TERMINAL


class ConflictError(RuntimeError): pass
class AdmissionRejected(RuntimeError): pass


class RunStore:
    """In-memory stand-in for PostgreSQL rows + transactional outbox.

    One lock gives this demo serializable fan-out/fan-in decisions. PostgreSQL
    production code needs a real transaction and parent-row lock instead.
    """
    def __init__(self, *, max_children: int = 8, total_budget: int = 1_000) -> None:
        self.runs: dict[UUID, Run] = {}
        self.children: dict[UUID, dict[str, UUID]] = defaultdict(dict)
        self.outbox: dict[str, OutboxEvent] = {}
        self.dispatched: set[str] = set()
        self.synthesis_published: set[str] = set()
        self.max_children = max_children
        self.total_budget = total_budget
        self._lock = asyncio.Lock()

    @asynccontextmanager
    async def transaction(self):
        async with self._lock:
            # The example mutates only after all validation. A real DB rolls back.
            yield self

    def add_parent(self, parent: Run) -> None:
        self.runs[parent.run_id] = parent

    def list_children(self, parent_id: UUID) -> list[Run]:
        return [self.runs[run_id] for run_id in self.children[parent_id].values()]

    def get_child(self, parent_id: UUID, child_key: str) -> Run | None:
        run_id = self.children[parent_id].get(child_key)
        return self.runs.get(run_id) if run_id else None

    def reserve_budget_once(self, parent: Run, child: Run, amount: int) -> None:
        if child.reserved_tokens:
            return
        reserved = sum(c.reserved_tokens for c in self.list_children(parent.run_id))
        if reserved + amount > self.total_budget:
            raise AdmissionRejected("budget envelope exceeded")
        child.reserved_tokens = amount

    def append_outbox_once(self, event: str, run: Run, *, suffix: str = "") -> None:
        key = f"{event}:{run.run_id}:{suffix}".rstrip(":")
        self.outbox.setdefault(key, OutboxEvent(key, event, run.run_id))

    def create_attempt(self, child: Run) -> UUID:
        if child.status in TERMINAL:
            raise ConflictError("terminal child must be explicitly reset by policy")
        child.generation += 1
        child.active_attempt_id = uuid4()
        child.status = Status.RUNNING
        return child.active_attempt_id

    def request_cancel(self, parent: Run) -> None:
        parent.status = Status.CANCELLING
        for child in self.list_children(parent.run_id):
            if child.status not in TERMINAL:
                child.status = Status.CANCELLED
