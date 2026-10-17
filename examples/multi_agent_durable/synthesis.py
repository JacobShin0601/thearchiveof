from __future__ import annotations

from .models import Snapshot, Status
from .store import RunStore


def synthesize(snapshot: Snapshot) -> dict:
    """Deterministic input shaping, not a claim of deterministic LLM output."""
    accepted = [i for i in snapshot.items if i.result and i.result.status in {Status.SUCCEEDED, Status.PARTIAL}]
    ordered = sorted(accepted, key=lambda i: (i.role, i.child_key))
    evidence = sorted({e.source for i in ordered for e in getattr(i.result.payload, "evidence", [])})
    return {"snapshot_id": snapshot.snapshot_id, "child_keys": [i.child_key for i in ordered], "evidence_sources": evidence, "missing_roles": list(snapshot.missing_roles)}


def publish_once(store: RunStore, snapshot: Snapshot) -> bool:
    if snapshot.snapshot_id in store.synthesis_published:
        return False
    store.synthesis_published.add(snapshot.snapshot_id)
    return True
