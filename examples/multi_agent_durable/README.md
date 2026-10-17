# Durable Child Run — runnable teaching example

This is a deterministic, single-process **teaching** implementation of the article’s investment-research parent run. It deliberately uses no queue, Redis, LLM, or network call.

```bash
cd examples/multi_agent_durable
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
pytest -q
python -m multi_agent_durable.demo
```

Run the commands from `examples/` for module discovery, or set `PYTHONPATH=.` from the repository root.

## What it proves

- Stable `parent_run_id + child_key` identities are idempotent; a mismatched input digest conflicts.
- Fan-out, budget reservation, and outbox insertion share one in-process critical section.
- Duplicate queue deliveries, duplicate terminal events, stale attempts, cancellation, and synthesis publishing are rejected or deduplicated by state and keys.
- A frozen snapshot orders synthesis input by `(role, child_key)`.

## What it does **not** prove

The lock models a single-process decision boundary only. It is **not** PostgreSQL row locking or a cross-worker transaction. A production implementation must use database transactions / row locks for run rows, an outbox dispatcher with at-least-once delivery, consumer deduplication, lease reconciliation for Redis capacity reservations, and an execution ledger for external side effects. Deterministic ordering is not deterministic LLM output.
