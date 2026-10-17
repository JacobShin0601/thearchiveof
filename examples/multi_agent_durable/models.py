from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from hashlib import sha256
from typing import Annotated, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Status(StrEnum):
    PLANNED = "planned"
    QUEUED = "queued"
    RUNNING = "running"
    WAITING_CHILDREN = "waiting_children"
    SYNTHESIS_QUEUED = "synthesis_queued"
    SUCCEEDED = "succeeded"
    PARTIAL = "partial"
    FAILED = "failed"
    CANCELLED = "cancelled"
    CANCELLING = "cancelling"


TERMINAL = {Status.SUCCEEDED, Status.PARTIAL, Status.FAILED, Status.CANCELLED}


def digest(value: str) -> str:
    return sha256(value.encode()).hexdigest()


class Evidence(BaseModel):
    source: str
    locator: str
    observed_at: str


class ResearchPayload(BaseModel):
    kind: Literal["research"]
    claims: list[str]
    evidence: list[Evidence]
    confidence: float = Field(ge=0, le=1)
    uncertainty: str


class DataPayload(BaseModel):
    kind: Literal["data"]
    metrics: dict[str, float]
    units: dict[str, str]
    as_of: str
    validation_errors: list[str] = Field(default_factory=list)


class RiskFactor(BaseModel):
    factor: str
    severity: Literal["low", "medium", "high"]
    evidence: list[Evidence]


class RiskPayload(BaseModel):
    kind: Literal["risk"]
    risks: list[RiskFactor]
    limitations: list[str]


Payload = Annotated[ResearchPayload | DataPayload | RiskPayload, Field(discriminator="kind")]


class ChildResult(BaseModel):
    """A versioned contract. A failure cannot carry a success payload."""

    model_config = ConfigDict(extra="forbid")
    schema_version: Literal["child-result.v1"] = "child-result.v1"
    child_key: str
    role: Literal["research", "data", "risk"]
    status: Literal[Status.SUCCEEDED, Status.PARTIAL, Status.FAILED, Status.CANCELLED]
    payload: Payload | None = None
    error_code: str | None = None
    accepted_attempt_id: UUID | None = None

    @model_validator(mode="after")
    def status_matches_payload(self) -> "ChildResult":
        if self.status in {Status.SUCCEEDED, Status.PARTIAL} and self.payload is None:
            raise ValueError("successful or partial results require a payload")
        if self.status in {Status.FAILED, Status.CANCELLED} and self.payload is not None:
            raise ValueError("failed or cancelled results cannot carry a success payload")
        if self.payload is not None and self.payload.kind != self.role:
            raise ValueError("payload kind must match the child role")
        return self


@dataclass(frozen=True)
class ChildSpec:
    role: Literal["research", "data", "risk"]
    logical_task_id: str
    input_text: str
    token_budget: int = 100
    required: bool = True

    @property
    def child_key(self) -> str:
        return f"{self.role}:{self.logical_task_id}"

    @property
    def input_digest(self) -> str:
        return digest(self.input_text)


@dataclass
class Run:
    run_id: UUID
    root_run_id: UUID
    parent_run_id: UUID | None
    child_key: str | None
    role: str
    input_digest: str
    status: Status = Status.PLANNED
    generation: int = 0
    active_attempt_id: UUID | None = None
    reserved_tokens: int = 0
    actual_tokens: int = 0
    result: ChildResult | None = None
    snapshot_id: str | None = None


@dataclass(frozen=True)
class OutboxEvent:
    key: str
    event: str
    run_id: UUID


@dataclass(frozen=True)
class SnapshotItem:
    role: str
    child_key: str
    accepted_attempt_id: UUID | None
    result: ChildResult | None


@dataclass(frozen=True)
class Snapshot:
    snapshot_id: str
    parent_run_id: UUID
    items: tuple[SnapshotItem, ...]
    missing_roles: tuple[str, ...]


def new_parent() -> Run:
    run_id = uuid4()
    return Run(run_id, run_id, None, None, "parent", digest("investment-report"))


def new_attempt() -> UUID:
    return uuid4()
