import asyncio

import pytest

from .models import ChildResult, ChildSpec, Evidence, ResearchPayload, Status, new_parent
from .orchestration import fan_out, on_child_terminal
from .policy import JoinPolicy
from .store import AdmissionRejected, ConflictError, RunStore
from .synthesis import publish_once, synthesize
from .worker import complete_child


def run(coro): return asyncio.run(coro)


def fixture():
    store, parent = RunStore(max_children=3, total_budget=300), new_parent()
    store.add_parent(parent)
    specs = [ChildSpec(role, "acme-2026", f"{role}: illustrative", 100) for role in ("research", "data", "risk")]
    return store, parent, specs


def success(child):
    return ChildResult(child_key=child.child_key, role=child.role, status="succeeded", payload=ResearchPayload(kind="research", claims=["x"], evidence=[Evidence(source="fixture", locator="x", observed_at="2026-10-17")], confidence=.8, uncertainty="illustrative")) if child.role == "research" else ChildResult(child_key=child.child_key, role=child.role, status="failed", error_code="fixture")


async def finish_all(store, children, policy):
    snapshot = None
    for child in children:
        attempt = store.create_attempt(child)
        result = success(child)
        await complete_child(store, child, attempt, result)
        snapshot = await on_child_terminal(store, child, policy) or snapshot
    return snapshot


def test_t01_replay_does_not_create_or_reserve_twice():
    store, parent, specs = fixture(); first = run(fan_out(store, parent, specs)); second = run(fan_out(store, parent, specs))
    assert [c.run_id for c in first] == [c.run_id for c in second]
    assert len(store.list_children(parent.run_id)) == 3 and sum(c.reserved_tokens for c in second) == 300


def test_t02_conflicting_digest_is_rejected():
    store, parent, specs = fixture(); run(fan_out(store, parent, specs))
    with pytest.raises(ConflictError): run(fan_out(store, parent, [ChildSpec("research", "acme-2026", "different")]))


def test_t03_duplicate_role_keeps_both_logical_children():
    store, parent, _ = fixture(); children = run(fan_out(store, parent, [ChildSpec("research", "a", "a"), ChildSpec("research", "b", "b")]))
    assert {c.child_key for c in children} == {"research:a", "research:b"}


def test_t04_concurrent_fanout_respects_capacity():
    store, parent, _ = fixture()
    async def race(): return await asyncio.gather(fan_out(store, parent, [ChildSpec("research", "a", "a")]), fan_out(store, parent, [ChildSpec("data", "b", "b"), ChildSpec("risk", "c", "c")]))
    run(race()); assert len(store.list_children(parent.run_id)) == 3


def test_t05_validation_happens_before_mutation():
    store, parent, _ = fixture()
    with pytest.raises(ConflictError): run(fan_out(store, parent, [ChildSpec("research", "a", "a"), ChildSpec("research", "a", "a")]))
    assert not store.list_children(parent.run_id)


def test_t06_outbox_survives_before_dispatch():
    store, parent, specs = fixture(); children = run(fan_out(store, parent, specs))
    assert {event.run_id for event in store.outbox.values() if event.event == "child_queued"} == {c.run_id for c in children}


def test_t07_duplicate_queue_delivery_uses_same_attempt_fence():
    store, parent, specs = fixture(); child = run(fan_out(store, parent, specs))[0]; attempt = store.create_attempt(child)
    assert run(complete_child(store, child, attempt, success(child))) and not run(complete_child(store, child, attempt, success(child)))


def test_t08_duplicate_terminal_event_queues_one_synthesis():
    store, parent, specs = fixture(); children = run(fan_out(store, parent, specs)); policy = JoinPolicy(required_roles=frozenset({"research"}), min_successes=1)
    child = children[0]; attempt = store.create_attempt(child); run(complete_child(store, child, attempt, success(child)))
    snapshot = run(on_child_terminal(store, child, policy)); assert snapshot and run(on_child_terminal(store, child, policy)) is None
    assert len([e for e in store.outbox.values() if e.event == "parent_synthesis_queued"]) == 1


def test_t09_stale_attempt_completion_is_rejected():
    store, parent, specs = fixture(); child = run(fan_out(store, parent, specs))[0]; old = store.create_attempt(child); fresh = store.create_attempt(child)
    assert not run(complete_child(store, child, old, success(child))) and run(complete_child(store, child, fresh, success(child)))


def test_t10_required_failure_makes_join_impossible():
    store, parent, specs = fixture(); child = run(fan_out(store, parent, specs))[0]; attempt = store.create_attempt(child)
    run(complete_child(store, child, attempt, ChildResult(child_key=child.child_key, role="research", status="failed", error_code="tool_failed")))
    assert run(on_child_terminal(store, child, JoinPolicy())) is None and parent.status == Status.FAILED


def test_t11_optional_failure_allows_partial_synthesis():
    store, parent, specs = fixture(); children = run(fan_out(store, parent, specs)); policy = JoinPolicy(required_roles=frozenset({"research"}), min_successes=1, accept_partial=True)
    child = children[0]; attempt = store.create_attempt(child); run(complete_child(store, child, attempt, success(child)))
    assert run(on_child_terminal(store, child, policy)) is not None


def test_t12_quorum_transitions_once():
    store, parent, _ = fixture(); children = run(fan_out(store, parent, [ChildSpec("research", "a", "a"), ChildSpec("research", "b", "b")]))
    policy = JoinPolicy(required_roles=frozenset(), min_successes=1)
    child = children[0]; attempt = store.create_attempt(child); run(complete_child(store, child, attempt, success(child)))
    assert run(on_child_terminal(store, child, policy)) is not None


def test_t13_cancel_blocks_spawn():
    store, parent, specs = fixture(); store.request_cancel(parent)
    with pytest.raises(AdmissionRejected): run(fan_out(store, parent, specs))


def test_t14_budget_replay_is_idempotent():
    store, parent, specs = fixture(); run(fan_out(store, parent, specs)); run(fan_out(store, parent, specs))
    assert sum(c.reserved_tokens for c in store.list_children(parent.run_id)) == 300


def test_t15_publish_is_idempotent():
    store, parent, specs = fixture(); children = run(fan_out(store, parent, specs)); snapshot = run(finish_all(store, children, JoinPolicy(required_roles=frozenset({"research"}), min_successes=1, accept_partial=True)))
    assert snapshot and publish_once(store, snapshot) and not publish_once(store, snapshot)


def test_t16_synthesis_order_is_stable():
    store, parent, _ = fixture(); children = run(fan_out(store, parent, [ChildSpec("research", "z", "z"), ChildSpec("research", "a", "a")]))
    policy = JoinPolicy(required_roles=frozenset(), min_successes=1)
    child = children[1]; attempt = store.create_attempt(child); run(complete_child(store, child, attempt, success(child))); snapshot = run(on_child_terminal(store, child, policy))
    assert snapshot and synthesize(snapshot)["child_keys"] == ["research:a"]
