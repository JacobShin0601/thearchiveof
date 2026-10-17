from __future__ import annotations

from .models import ChildSpec, Run, Snapshot, SnapshotItem, Status, TERMINAL, digest
from .policy import JoinPolicy
from .store import AdmissionRejected, ConflictError, RunStore


async def fan_out(store: RunStore, parent: Run, specs: list[ChildSpec]) -> list[Run]:
    """Idempotently create logical children and their outbox messages.

    Existing keys consume neither a new child slot nor a new budget reservation.
    The same key with a different input is an explicit conflict.
    """
    if len({s.child_key for s in specs}) != len(specs):
        raise ConflictError("duplicate child_key in one plan")
    async with store.transaction():
        if parent.status in {Status.CANCELLING, Status.CANCELLED}:
            raise AdmissionRejected("parent is cancelling")
        new_specs = [s for s in specs if store.get_child(parent.run_id, s.child_key) is None]
        if len(store.list_children(parent.run_id)) + len(new_specs) > store.max_children:
            raise AdmissionRejected("max_children exceeded")
        children: list[Run] = []
        for spec in specs:
            child = store.get_child(parent.run_id, spec.child_key)
            if child is not None:
                if child.input_digest != spec.input_digest:
                    raise ConflictError("child_key reused with a different input_digest")
                children.append(child)
                continue
            child = Run(
                run_id=__import__("uuid").uuid4(), root_run_id=parent.root_run_id,
                parent_run_id=parent.run_id, child_key=spec.child_key, role=spec.role,
                input_digest=spec.input_digest, status=Status.QUEUED,
            )
            store.reserve_budget_once(parent, child, spec.token_budget)
            store.runs[child.run_id] = child
            store.children[parent.run_id][spec.child_key] = child.run_id
            store.append_outbox_once("child_queued", child)
            children.append(child)
        parent.status = Status.WAITING_CHILDREN
        return children


async def on_child_terminal(store: RunStore, child: Run, policy: JoinPolicy) -> Snapshot | None:
    """Re-read authoritative child rows; duplicated terminal events are harmless."""
    async with store.transaction():
        parent = store.runs[child.parent_run_id]
        if parent.status != Status.WAITING_CHILDREN:
            return None
        decision = policy.evaluate(store.list_children(parent.run_id))
        if decision == "impossible":
            parent.status = Status.FAILED
            return None
        if decision != "ready":
            return None
        items = tuple(
            SnapshotItem(c.role, c.child_key or "", c.active_attempt_id, c.result)
            for c in sorted(store.list_children(parent.run_id), key=lambda c: (c.role, c.child_key or ""))
        )
        missing = tuple(sorted(policy.required_roles - {i.role for i in items if i.result and i.result.status in {Status.SUCCEEDED, Status.PARTIAL}}))
        snapshot = Snapshot(digest("|".join(f"{i.child_key}:{i.accepted_attempt_id}" for i in items)), parent.run_id, items, missing)
        parent.snapshot_id = snapshot.snapshot_id
        parent.status = Status.SYNTHESIS_QUEUED
        store.append_outbox_once("parent_synthesis_queued", parent, suffix=snapshot.snapshot_id)
        return snapshot
