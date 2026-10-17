from __future__ import annotations

from dataclasses import dataclass

from .models import Run, Status, TERMINAL


@dataclass(frozen=True)
class JoinPolicy:
    required_roles: frozenset[str] = frozenset({"research", "data", "risk"})
    min_successes: int = 3
    accept_partial: bool = False
    cancel_remaining_on_satisfied: bool = False

    def evaluate(self, children: list[Run]) -> str:
        success = [c for c in children if c.status in {Status.SUCCEEDED, Status.PARTIAL}]
        successes_by_role = {c.role for c in success}
        required_missing = self.required_roles - successes_by_role
        if len(success) >= self.min_successes and not required_missing:
            return "ready"
        failed_required = [c for c in children if c.role in self.required_roles and c.status in {Status.FAILED, Status.CANCELLED}]
        if failed_required and not self.accept_partial:
            return "impossible"
        if children and all(c.status in TERMINAL for c in children):
            return "impossible"
        return "waiting"
