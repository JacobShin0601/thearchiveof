from __future__ import annotations

import asyncio

from .models import (
    ChildResult, ChildSpec, DataPayload, Evidence, ResearchPayload, RiskFactor,
    RiskPayload, new_parent,
)
from .orchestration import fan_out, on_child_terminal
from .policy import JoinPolicy
from .store import RunStore
from .synthesis import publish_once, synthesize
from .worker import complete_child


async def main() -> None:
    store, parent = RunStore(), new_parent()
    store.add_parent(parent)
    specs = [ChildSpec(role, "acme-2026", "ACME illustrative input", 100) for role in ("research", "data", "risk")]
    children = await fan_out(store, parent, specs)
    snapshot = None
    for child in children:
        attempt = store.create_attempt(child)
        # Deterministic mocks replace external LLM/API calls in this teaching demo.
        evidence = Evidence(source="fixture", locator=child.role, observed_at="2026-10-17")
        payload = {
            "research": ResearchPayload(kind="research", claims=["business model mapped"], evidence=[evidence], confidence=.8, uncertainty="illustrative"),
            "data": DataPayload(kind="data", metrics={"revenue": 100.0}, units={"revenue": "USDm"}, as_of="2026-10-17"),
            "risk": RiskPayload(kind="risk", risks=[RiskFactor(factor="competition", severity="medium", evidence=[evidence])], limitations=["illustrative"]),
        }[child.role]
        result = ChildResult(child_key=child.child_key or "", role=child.role, status="succeeded", payload=payload)
        await complete_child(store, child, attempt, result)
        snapshot = await on_child_terminal(store, child, JoinPolicy()) or snapshot
    assert snapshot is not None and publish_once(store, snapshot)
    print(synthesize(snapshot))


if __name__ == "__main__":
    asyncio.run(main())
