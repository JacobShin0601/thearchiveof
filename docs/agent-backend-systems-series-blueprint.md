# The Archive — Agent Backend Systems Series Blueprint

> Status: series planning document  
> Purpose: reusable backlog for drafting one article at a time  
> Source language: Korean  
> Working series name: **에이전트 백엔드 시스템 / Agent Backend Systems**

---

## 0. Series thesis

이 시리즈는 LangGraph 사용법이나 특정 프레임워크 튜토리얼이 아니다.

핵심 관점은 다음과 같다.

> **An agent is not an LLM loop. It is a distributed stateful system.**

실제 서비스의 에이전트는 대략 아래 요소가 함께 있어야 한다.

```text
LLM
+ execution runtime
+ async concurrency
+ workers
+ queues
+ state
+ events
+ streaming
+ persistence
+ session isolation
+ authentication / authorization
+ failure recovery
+ deployment / scaling
```

시리즈의 목적은 "LangGraph를 어떻게 쓰는가"보다 먼저 다음 질문에 답하는 것이다.

- 왜 agent backend에서 `async`가 중요한가?
- `async`, thread, process, worker는 무엇이 다른가?
- 왜 HTTP API process에서 장시간 agent run을 직접 소유하면 안 되는가?
- state와 event는 왜 분리해야 하는가?
- Redis와 PostgreSQL은 각각 무엇을 맡아야 하는가?
- SSE는 어떻게 worker의 진행상황을 브라우저까지 전달하는가?
- LangGraph의 `updates`와 `custom` stream은 전체 시스템에서 어디에 위치하는가?
- session과 run은 왜 분리해야 하는가?
- 여러 사용자의 세션은 어떻게 격리하는가?
- worker가 죽으면 job은 어떻게 복구하는가?
- Kubernetes에서는 API와 worker를 어떻게 분리하고 scale하는가?

프레임워크는 이 문제들을 해결하기 위한 한 구현 수단으로 등장시킨다.

---

# 1. Recommended narrative arc

전체 흐름은 다음 순서로 가져간다.

```text
Concurrency
    ↓
Execution ownership
    ↓
State
    ↓
Events
    ↓
Streaming
    ↓
Agent runtime
    ↓
Session isolation
    ↓
Queue reliability
    ↓
Kubernetes
    ↓
End-to-end architecture
```

큰 파트는 네 개로 나눈다.

## Part I — Execution

1. Async
2. Thread / Process
3. Worker

질문:

> Agent는 어떻게 여러 일을 동시에 처리하며, 누가 실행을 소유하는가?

## Part II — State & Streaming

4. State persistence
5. State vs Event
6. SSE / Streaming

질문:

> Agent는 어떻게 상태를 기억하고 사용자에게 진행상황을 보여주는가?

## Part III — Agent Runtime

7. LangGraph
8. Session / Run
9. Queue / Reliability

질문:

> 실제 agent runtime은 어떤 단위로 실행되고, 어떻게 격리되며, 실패를 어떻게 복구하는가?

## Part IV — Production

10. Kubernetes
11. End-to-End Request Lifecycle

질문:

> 이 모든 구성요소를 실제 서비스에서 어떻게 연결하고 운영하는가?

---

# 2. Shared mental model used across the series

시리즈 전반에서 같은 예제 시스템을 반복 사용한다.

## Example request

사용자가 브라우저에서 다음 요청을 보낸다.

> NVIDIA의 최근 실적과 valuation을 분석해줘.

시스템은:

1. 사용자 인증
2. session 확인
3. run/job 생성
4. worker에게 전달
5. LangGraph 실행
6. 검색 / DB / LLM 호출
7. progress state 업데이트
8. event 기록
9. SSE로 브라우저에 실시간 전달
10. 최종 결과 저장

을 수행한다.

## Core entities

```text
Tenant
 └─ User
     └─ Session
         ├─ Run / Job #1
         ├─ Run / Job #2
         └─ ...
```

의미:

```text
Tenant
= 회사 / 조직 경계

User
= 실제 사용자

Session
= 지속적인 대화 또는 작업 context

Run / Job
= 한 번의 agent execution

State
= 특정 시점의 현재 상태

Event
= 실행 중 일어난 사건의 시간순 기록
```

---

# 3. Canonical production architecture

시리즈 전체에서 사용할 기준 아키텍처.

```text
                         Browser
                            │
                            │ HTTPS / SSE
                            ▼
                     Ingress / SSO
                            │
                            ▼
                   ┌────────────────┐
                   │ FastAPI API    │
                   │ Deployment     │
                   └───────┬────────┘
                           │
               ┌───────────┼─────────────┐
               │           │             │
               ▼           ▼             ▼
          PostgreSQL     Redis        SSE connection
                           │
              ┌────────────┼─────────────┐
              │            │             │
              ▼            ▼             ▼
         job queue      job state     job events
              │
              │ XREADGROUP
              ▼
       ┌────────────────┐
       │ Worker         │
       │ Deployment     │
       └───────┬────────┘
               │
               ▼
          LangGraph
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
      LLM     DB      Tools
       │
       └────────┬───────┘
                │
          updates/custom
                │
        ┌───────┴────────┐
        ▼                ▼
     HSET              XADD
   current state      events
        │                │
        └────────┬───────┘
                 ▼
               Redis
                 │
               XREAD
                 │
                 ▼
             FastAPI SSE
                 │
                 ▼
               Browser
```

핵심 원칙:

> **SSE request가 LangGraph execution을 소유하게 하지 않는다.**

즉 다음 구조는 피한다.

```text
Browser
  ↓ SSE
FastAPI
  ↓
LangGraph
```

대신:

```text
Browser
  ↓
FastAPI SSE
  ↓
Redis
  ↑
Worker
  ↑
LangGraph
```

실행과 관찰을 분리한다.

---

# 4. Article 1 — Why Agent Systems Need Async

## Working title

Korean:

**에이전트는 왜 Async가 필요한가: 기다리는 동안 다른 일을 시키는 법**

English:

**Why Agent Systems Need Async**

## Core question

Agent workload의 대부분이 LLM, DB, network I/O라면 왜 synchronous execution이 비효율적인가?

## Learning goals

- blocking / non-blocking
- coroutine
- event loop
- `await`
- task
- `asyncio.gather`
- I/O-bound workload
- concurrency vs parallelism

## Opening example

순차 실행:

```python
docs = await search_documents(query)
web = await search_web(query)
db = await query_database(query)
```

각각 2초라면 대략 6초.

독립 작업이라면:

```python
docs, web, db = await asyncio.gather(
    search_documents(query),
    search_web(query),
    query_database(query),
)
```

가장 느린 작업이 2초라면 전체는 약 2초 + overhead.

## Key explanation

`async`의 핵심은 CPU를 여러 개 동시에 쓰는 것이 아니다.

```text
Task A
HTTP request ─────────────── waiting

Task B           DB request ───────── waiting

Task C                     Redis request ─── waiting
```

한 thread의 event loop가 I/O 대기시간에 다른 coroutine을 실행한다.

## Important distinction

```text
Concurrency
= 여러 작업이 진행 중인 상태

Parallelism
= 여러 작업이 실제 같은 순간 CPU에서 실행
```

`asyncio`는 주로 concurrency 도구다.

## Agent-specific examples

Async에 잘 맞는 것:

- LLM API
- vector DB
- PostgreSQL
- Redis
- web search
- HTTP APIs
- object storage

## Bridge to next article

> 하지만 기다리는 것이 아니라 계산 자체가 오래 걸린다면?  
> 같은 event loop에서 CPU를 오래 잡으면 async는 도움이 되지 않는다.

---

# 5. Article 2 — Async vs Thread vs Process

## Working title

Korean:

**Async, Thread, Process: Agent Worker를 이해하기 전에 알아야 할 것**

English:

**Async, Threads, and Processes for Agent Backends**

## Core question

`async`, multithreading, multiprocessing은 서로 어떤 문제를 푸는가?

## Comparison

```text
Async
- 한 thread의 event loop
- I/O waiting에 강함

Thread
- 같은 process 안의 여러 OS thread
- shared memory
- blocking I/O / legacy SDK에 유용

Process
- 별도 process / interpreter / memory
- CPU-bound parallelism 가능
```

## Python GIL

깊게 파고들기보다 다음 정도로 설명.

- 일반적인 CPython에서는 한 process 내 pure Python bytecode의 CPU-bound multi-thread parallelism에 제약이 있다.
- thread는 I/O-heavy workload에서는 여전히 유용하다.
- CPU-bound workload라면 process 또는 dedicated compute service가 자연스럽다.

## Examples

```text
LLM API
→ async

PostgreSQL query
→ async

blocking Python SDK
→ thread offload 가능

heavy pure-Python calculation
→ process

large Monte Carlo
→ dedicated CPU worker

local LLM inference
→ GPU inference service
```

## Bridge

> 그런데 "어떻게 동시에 실행하나"와 "누가 이 작업의 lifecycle을 소유하나"는 다른 질문이다.

---

# 6. Article 3 — A Worker Is Not a Thread

## Working title

Korean:

**Worker는 Thread가 아니다: Agent 실행을 API 서버에서 분리하는 이유**

English:

**A Worker Is Not a Thread**

## Core thesis

> Worker는 concurrency primitive가 아니라 workload ownership boundary다.

## Misconception to break

```text
async
thread
process
worker
```

를 같은 레벨의 선택지로 보면 안 된다.

Worker는 역할(role)이고 내부에서:

```text
Worker process
   └─ asyncio event loop
        ├─ job A
        ├─ job B
        └─ job C
```

처럼 async를 쓸 수 있다.

## Bad pattern

```python
@app.post("/analysis")
async def analysis():
    asyncio.create_task(run_analysis())
    return {"status": "started"}
```

기술적으로 가능하지만 production 장시간 job에는 취약하다.

API process가:

- rolling deployment
- OOM
- crash
- pod restart

되면 background task도 같이 사라질 수 있다.

## Better pattern

```text
FastAPI
   ↓
Queue
   ↓
Worker
   ↓
LangGraph
```

## API role

API는 가볍게 유지한다.

- authentication handoff
- authorization
- request validation
- job creation
- lightweight DB access
- Redis access
- SSE connection

## Worker role

- LangGraph 실행
- tool orchestration
- analysis
- parser / reranking
- progress state update
- event publish
- result persistence

## Kubernetes interpretation

Worker는 특별한 Kubernetes object가 아니다.

같은 image여도 된다.

```text
my-agent:1.0

API Deployment
command: uvicorn app.api:app

Worker Deployment
command: python -m app.worker
```

---

# 7. Article 4 — Where Does Agent State Live?

## Working title

Korean:

**Agent State는 어디에 살아야 하는가: Redis, PostgreSQL, Checkpoint**

English:

**Where Does Agent State Live?**

## Core question

Agent execution state를 전부 한 DB에 넣으면 되는가?

## Durable vs ephemeral

```text
PostgreSQL
= durable source of truth

Redis
= hot / ephemeral operational state
```

## PostgreSQL candidates

- users
- sessions
- runs
- messages
- final results
- audit
- durable checkpoints
- tool execution records if auditability required

## Redis candidates

- current run status
- progress
- current step
- locks
- queue
- temporary cache
- event stream

## JSONB

JSONB를 소개하는 위치.

예:

```sql
CREATE TABLE runs (
    run_id UUID PRIMARY KEY,
    session_id UUID NOT NULL,
    status TEXT NOT NULL,
    state JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

원칙:

- 자주 검색/조인/필터되는 필드는 relational column
- optional / flexible nested data는 JSONB

## Redis state example

```text
job:123:state

status        running
current_step  valuation
progress      65
updated_at    ...
```

---

# 8. Article 5 — State Is Not an Event

## Working title

Korean:

**State는 Event가 아니다: 실시간 Agent UI를 설계하는 법**

English:

**State Is Not an Event**

## Core distinction

State:

> 지금 어떤 상태인가?

Event:

> 어떤 일이 일어났는가?

## Example

State:

```json
{
  "status": "running",
  "current_step": "valuation",
  "progress": 65
}
```

Events:

```text
financial_data_loaded
peer_selection_completed
multiples_completed
dcf_started
terminal_value_completed
```

UI 예시:

```text
┌───────────────────────────────┐
│ 기업 분석                     │
│                               │
│ 현재 상태: 분석 중 65%        │  ← state
│ 현재 단계: Valuation          │
│                               │
│ ✓ 재무자료 로딩               │  ← events
│ ✓ Peer 선정                   │
│ ✓ Multiples 계산              │
│ → DCF 계산 시작               │
└───────────────────────────────┘
```

## Redis structures

### Hash

```text
HSET
HGETALL
```

현재 snapshot.

### Stream

```text
XADD
XREAD
```

시간순 event log.

## Commands

`HSET`

```python
await redis.hset(
    f"job:{job_id}:state",
    mapping={
        "status": "running",
        "progress": 65,
    },
)
```

`HGETALL`

```python
state = await redis.hgetall(
    f"job:{job_id}:state"
)
```

`XADD`

```python
await redis.xadd(
    f"job:{job_id}:events",
    {
        "type": "dcf_started",
        "payload": "{}",
    },
)
```

`XREAD`

```python
events = await redis.xread(
    {f"job:{job_id}:events": last_id},
    block=15_000,
)
```

---

# 9. Article 6 — SSE, Iterators, Generators, and Redis Streams

## Working title

Korean:

**Agent가 일하면서 말하게 하기: SSE, Generator, Redis Streams**

English:

**How an Agent Talks While It Works**

## Iterator vs Generator

Iterator는 protocol.

```python
class MyIterator:
    def __iter__(self):
        return self

    def __next__(self):
        ...
```

Generator는 `yield`로 iterator를 쉽게 만드는 Python mechanism.

```python
def numbers():
    yield 1
    yield 2
    yield 3
```

관계:

```text
모든 generator는 iterator다.
모든 iterator가 generator인 것은 아니다.
```

Async generator:

```python
async def events():
    while True:
        event = await get_next_event()
        yield event
```

소비:

```python
async for event in events():
    ...
```

## SSE

Stream 자체가 generator라는 뜻은 아니다.

Python/FastAPI에서 streaming을 구현할 때 async generator가 편리하다.

```python
async def event_generator():
    while True:
        event = await get_next_event()
        yield f"data: {event}\n\n"

return StreamingResponse(
    event_generator(),
    media_type="text/event-stream",
)
```

## Snapshot + Events pattern

브라우저가 SSE connection을 열면:

```text
1. 현재 state snapshot 전달
2. 이후 새로운 event만 계속 전달
```

```text
HGETALL
  ↓
현재 화면 즉시 복원

XREAD
  ↓
그 이후 이벤트 계속 전달
```

## Reconnect concern

단순 Redis Pub/Sub는 subscriber가 disconnect된 동안 event를 잃을 수 있다.

Redis Stream은 ID 기반으로 이어읽기 가능.

SSE의 `Last-Event-ID`와 결합 가능한 설계 포인트.

## Race condition note

단순:

```text
HGETALL
↓
XREAD "$"
```

사이에 event가 발생하면 놓칠 수 있다.

production 설계에서는:

- stream cursor를 먼저 확보
- snapshot을 읽고
- 확보한 cursor 이후부터 읽기

또는 transaction / Lua 등으로 일관성 확보를 고려한다.

---

# 10. Article 7 — LangGraph Is the Runtime, Not the Architecture

## Working title

Korean:

**LangGraph는 Architecture가 아니다: Runtime의 정확한 위치**

English:

**LangGraph Is the Runtime, Not the Architecture**

## Core message

LangGraph는 전체 backend architecture를 대신하지 않는다.

```text
Worker
  ↓
LangGraph
  ↓
Node execution
  ↓
updates / custom
  ↓
Redis / DB
```

## `graph.astream()`

LangGraph async streaming.

권장 예시는 최신 `version="v2"` 형태.

```python
async for part in graph.astream(
    input_data,
    stream_mode=["updates", "custom"],
    version="v2",
):
    event_type = part["type"]
    data = part["data"]
```

## updates

Node가 state에서 바꾼 부분만 전달.

기존 state:

```python
{
    "query": "NVDA margin analysis",
    "documents": [],
    "analysis": None,
    "status": "searching",
}
```

node:

```python
async def search_node(state):
    docs = await search(state["query"])

    return {
        "documents": docs,
        "status": "analyzing",
    }
```

updates는 대략:

```python
{
    "search_node": {
        "documents": [...],
        "status": "analyzing",
    }
}
```

다른 key는 생략된다.

LangGraph 내부 state는 기존 값과 node output을 merge한다.

```text
query        유지
documents    새 값
analysis     유지
status       새 값
```

## Reducers

기본적인 scalar key는 replace.

messages처럼 누적이 필요한 field는 reducer를 명시할 수 있다.

핵심:

> LangGraph state merge와 Redis state update는 서로 다른 층의 문제다.

## Redis reflection

Worker가 LangGraph update를 보고 UI용 state만 Redis에 반영.

```python
await redis.hset(
    f"job:{job_id}:state",
    mapping={
        "status": "analyzing"
    },
)
```

큰 `documents`, `analysis`, tool payload를 Redis에 그대로 mirror할 필요는 없다.

## custom

`custom`은 state가 아니라 event 성격.

예:

```python
from langgraph.config import get_stream_writer

async def analyze_documents(state):
    writer = get_stream_writer()

    results = []

    for i, doc in enumerate(state["documents"]):
        result = await analyze(doc)
        results.append(result)

        writer({
            "type": "progress",
            "completed": i + 1,
            "total": len(state["documents"]),
        })

    return {"analysis": results}
```

한 node가 오래 실행될 때 node completion 전에 progress event를 emit할 수 있다.

Worker:

```python
if part["type"] == "custom":
    await redis.xadd(
        f"job:{job_id}:events",
        {
            "payload": json.dumps(part["data"])
        },
    )
```

필요하면 custom event 일부를 snapshot에도 반영할 수 있다.

예:

```text
Event
"document 3 completed"

State
progress = 30%
```

## Important conceptual distinction

```text
LangGraph State
≠ Redis UI State
≠ Browser UI State
```

같을 필요가 없다.

---

# 11. Article 8 — A Conversation Is Not a Run

## Working title

Korean:

**Conversation은 Run이 아니다: Session Isolation 설계**

English:

**A Conversation Is Not a Run**

## Core model

```text
Tenant
 └─ User
     └─ Session
         ├─ Run 1
         ├─ Run 2
         └─ Run 3
```

## Session

지속적인 context.

예:

```text
User:
"NVIDIA 분석해줘"

Run #1
```

이후:

```text
User:
"방금 분석에 AMD도 비교해줘"

Run #2
same session
```

## Run / Job

한 번의 agent execution.

LangGraph hosted concepts와 용어를 맞추면:

```text
Session ≈ Thread
Run / Job ≈ Run
```

직접 구축에서는 `job` 또는 `run`을 애플리케이션 레벨 entity로 정의한다.

## LangGraph persistence

```python
config = {
    "configurable": {
        "thread_id": session_id
    }
}
```

같은 session의 checkpoints/context를 연결하는 방식.

## Session isolation

보안 경계:

```text
tenant_id
user_id
session_id
run_id
```

DB에는 반드시 ownership 관계를 둔다.

예:

```text
runs
- run_id
- session_id
- user_id
- tenant_id
```

Redis key가 UUID라고 해서 authorization이 자동 보장되는 것은 아니다.

## FastAPI authorization path

```text
Browser
  ↓
SSO
  ↓
FastAPI
  ↓
authenticate user
  ↓
authorize tenant/session
  ↓
Redis / PostgreSQL access
```

예:

```text
GET /sessions/S1/runs/R1/events
```

FastAPI는 먼저 R1이 S1에 속하는지, S1이 현재 사용자/tenant에 속하는지 확인해야 한다.

## Same-session concurrency

같은 session에 run 두 개가 동시에 들어오면:

```text
Run A ─┐
       ├─ same session state → race
Run B ─┘
```

초기 설계 원칙:

> one active run per session

구현:

- Redis distributed lock
- session run queue
- optimistic versioning
- explicit branching if concurrent semantics required

---

# 12. Article 9 — When Workers Die

## Working title

Korean:

**Worker가 죽으면 어떻게 되는가: Queue, XREADGROUP, XACK, Retry**

English:

**When Workers Die**

## agent:jobs

Redis Stream을 work queue처럼 사용.

```text
agent:jobs

1001-0  run_id=A
1002-0  run_id=B
1003-0  run_id=C
```

API:

```python
await redis.xadd(
    "agent:jobs",
    {
        "run_id": run_id,
        "session_id": session_id,
    },
)
```

## Why XREADGROUP instead of XREAD

worker replicas:

```text
Worker 1
Worker 2
Worker 3
```

모두 같은 job을 실행하면 안 된다.

Consumer Group:

```text
Redis Stream: agent:jobs
        │
        ▼
Consumer Group: agent-workers

   ┌────┼────┐
   ▼    ▼    ▼
  W1   W2   W3
```

각 worker가 서로 다른 entry를 받는다.

## Worker loop

```python
async def worker_loop():
    while True:
        messages = await redis.xreadgroup(
            groupname="agent-workers",
            consumername=HOSTNAME,
            streams={"agent:jobs": ">"},
            count=1,
            block=5000,
        )

        for message in messages:
            run_id = extract_run_id(message)

            try:
                await run_agent(run_id)

                await redis.xack(
                    "agent:jobs",
                    "agent-workers",
                    message.id,
                )

            except Exception:
                ...
```

## XACK

ACK = acknowledgment.

의미:

> 이 queue entry를 성공적으로 처리했다.

`XREADGROUP`으로 전달되면 consumer group의 Pending Entries List에 남는다.

```text
Job A
→ Worker 1에게 전달
→ pending
```

성공:

```text
XACK
→ PEL에서 제거
```

주의:

> XACK은 Redis Stream entry 자체를 삭제하는 것이 아니다.

## Worker crash

```text
Worker 1
  ↓
Job A 실행 중
  ↓
Pod crash
```

XACK하지 않았기 때문에 job은 pending 상태.

다른 worker가 reclaim 후 retry할 수 있다.

## Delivery semantics

기본적으로 at-least-once를 전제로 생각.

따라서:

- idempotency
- retry policy
- timeout
- retry counter
- poison message handling
- dead-letter queue
- lease / reclaim

을 다룬다.

---

# 13. Article 10 — Running Agents on Kubernetes

## Working title

Korean:

**Kubernetes에서 Agent를 돌리는 법: API Pod와 Worker Pod 분리**

English:

**Running Agents on Kubernetes**

## Important correction

"Worker"는 Kubernetes resource type이 아니다.

보통 Worker application을 `Deployment`로 운영한다.

```text
agent-api Deployment
  ├─ api pod 1
  ├─ api pod 2
  └─ ...

agent-worker Deployment
  ├─ worker pod 1
  ├─ worker pod 2
  └─ ...
```

## API Pod

주요 역할:

- SSO identity consume
- authorization
- validation
- session/run creation
- lightweight DB operations
- Redis enqueue
- SSE socket

resource profile 예시:

```text
CPU request: 250m
Memory: 512Mi
```

수치는 illustrative example임을 명시.

## Worker Pod

주요 역할:

- LangGraph
- tool calls
- orchestration
- parsing
- analysis
- progress/event update
- persistence

resource profile 예시:

```text
CPU request: 1–2 CPU
Memory: 2–4 GiB
```

역시 실제 workload에 따라 달라지는 예시.

## Async inside worker

Worker와 async는 경쟁 개념이 아니다.

```text
Worker Pod
  ↓
Python process
  ↓
asyncio event loop
  ├─ Run A → await LLM
  ├─ Run B → await DB
  ├─ Run C → await HTTP
  └─ Run D → await Redis
```

I/O-heavy agent라면 한 worker process가 제한된 concurrency로 여러 run을 처리할 수 있다.

## CPU-heavy path

CPU-heavy code는 event loop를 막을 수 있다.

```text
agent-worker Deployment
- I/O heavy
- async concurrency

cpu-worker Deployment
- CPU heavy
- lower concurrency
- higher CPU request
```

self-hosted model:

```text
vLLM / inference Deployment
- GPU
```

로 별도 분리 가능.

## Why not one Kubernetes Job per request?

일반 10초~수분 agent request마다:

```text
request
→ K8s Job create
→ pod scheduling
→ image startup
→ execute
→ terminate
```

하면 startup/scheduling overhead가 있다.

일반 agent workload에는 long-lived Worker Deployment가 더 자연스럽다.

긴 batch / isolated compute라면 Kubernetes Job을 고려.

## Scaling

API replicas:

```text
request / connection volume
```

Worker replicas:

```text
queue depth
consumer lag
pending jobs
```

KEDA를 통한 Redis Stream 기반 autoscaling은 별도 implementation article 후보.

---

# 14. Article 11 — An Agent Request, End to End

## Working title

Korean:

**Agent Request 하나를 끝까지 따라가 보기**

English:

**An Agent Request, End to End**

이 글은 전체 시리즈의 anchor / synthesis 역할.

## End-to-end lifecycle

### Step 1 — Browser request

```text
POST /sessions/{session_id}/runs
```

body:

```json
{
  "query": "NVIDIA의 최근 실적과 valuation을 분석해줘",
  "analysis_type": "deep"
}
```

### Step 2 — SSO

```text
Browser
  ↓
Ingress
  ↓
SSO sidecar / auth proxy
  ↓
FastAPI
```

FastAPI는 신뢰 가능한 upstream에서 user identity / claims를 전달받는다.

중요:

- FastAPI가 sidecar 우회 접근을 허용하면 안 됨.
- user-provided header를 그대로 신뢰하면 안 됨.

### Step 3 — Validation

Pydantic example:

```python
class AnalysisRequest(BaseModel):
    query: str
    analysis_type: Literal["quick", "deep"]
```

### Step 4 — Authorization

FastAPI:

- current user
- tenant
- session ownership

확인.

### Step 5 — Run row 생성

PostgreSQL:

```text
run_id
session_id
tenant_id
user_id
status = queued
created_at
```

### Step 6 — Redis current state

```text
HSET run:{run_id}:state

status = queued
progress = 0
```

### Step 7 — Queue enqueue

```text
XADD agent:jobs
```

payload 최소화 권장:

- run_id
- session_id
- possibly priority / queue metadata

큰 request payload는 durable DB에서 조회하게 할 수 있다.

### Step 8 — API response

FastAPI는 worker 완료를 기다리지 않고 run_id 반환.

```json
{
  "run_id": "...",
  "status": "queued"
}
```

### Step 9 — Browser SSE connection

```text
GET /sessions/{session_id}/runs/{run_id}/events
```

FastAPI:

1. authorize
2. current state snapshot
3. event stream

### Step 10 — Worker consume

```text
XREADGROUP agent:jobs
```

Worker 중 하나가 run을 소유.

### Step 11 — Session context load

Worker:

- run row 조회
- session context 조회
- LangGraph checkpoint 조회
- necessary tool config load

### Step 12 — LangGraph execution

```python
async for part in graph.astream(
    input_data,
    config=config,
    stream_mode=["updates", "custom"],
    version="v2",
):
    await handle_stream_part(run_id, part)
```

### Step 13 — updates handling

```text
LangGraph updates
  ↓
Worker mapping
  ↓
HSET current UI state
```

모든 LangGraph field를 Redis에 mirror하지 않는다.

### Step 14 — custom handling

```text
LangGraph custom
  ↓
XADD run:{id}:events
```

예:

```json
{
  "type": "progress",
  "step": "analyze_documents",
  "completed": 3,
  "total": 10
}
```

### Step 15 — FastAPI SSE relay

```text
Redis Stream
  ↓ XREAD
FastAPI async generator
  ↓ yield
SSE
  ↓
Browser
```

### Step 16 — Browser rendering

State:

```text
분석 중 65%
현재 단계: Valuation
```

Events:

```text
✓ 문서 검색 완료
✓ Peer 선정 완료
→ DCF 시작
```

### Step 17 — Complete

Worker:

- final result persist
- checkpoint persist
- run status = completed
- Redis current state update
- completion event append

### Step 18 — XACK

```text
XACK agent:jobs
```

consumer group에게:

> 이 queue message는 성공적으로 처리되었다.

## Canonical diagram

```text
Browser
   │
   │ POST run
   ▼
FastAPI
   │
   ├── INSERT ───────────────→ PostgreSQL
   │
   ├── HSET ─────────────────→ run:{id}:state
   │
   └── XADD ─────────────────→ agent:jobs
                                    │
                                    ▼
                               Worker Pod
                                    │
                                XREADGROUP
                                    │
                                    ▼
                              graph.astream()
                                    │
                           ┌────────┴────────┐
                           │                 │
                        updates           custom
                           │                 │
                         HSET              XADD
                           │                 │
                           ▼                 ▼
                      current state     run:{id}:events
                           │                 │
                           └────────┬────────┘
                                    │
                                  Redis
                                    │
                                  XREAD
                                    │
                                    ▼
                              FastAPI SSE
                                    │
                                    ▼
                                 Browser

Worker complete
   │
   ├─ PostgreSQL persist
   ├─ Redis state = completed
   ├─ completion event
   └─ XACK agent:jobs
```

---

# 15. FastAPI implementation responsibilities

이 내용은 Article 8~11에 분산해서 사용.

## SSO / auth

사내 SSO sidecar가 있다면 FastAPI가 login flow 전체를 구현할 필요는 없다.

예:

```text
Browser
  ↓
Ingress
  ↓
SSO sidecar
  ↓
verified identity
  ↓
FastAPI
```

FastAPI 역할:

- trusted identity consume
- authorization
- tenant/session ownership check

주의:

- external client가 FastAPI에 직접 접근할 수 없게 network / ingress policy 구성
- arbitrary `X-User-ID` header를 신뢰하지 않기

## Validation

FastAPI + Pydantic.

```python
class RunRequest(BaseModel):
    query: str
    mode: Literal["quick", "deep"]
```

## DB

SQLAlchemy async / asyncpg 등.

```python
async with sessionmaker() as db:
    ...
```

## Redis

`redis.asyncio`.

## SSE

```python
@app.get("/sessions/{session_id}/runs/{run_id}/events")
async def stream_run(...):

    async def generator():
        snapshot = await redis.hgetall(
            f"run:{run_id}:state"
        )

        yield make_sse(
            event="snapshot",
            data=snapshot,
        )

        while True:
            events = await redis.xread(
                {f"run:{run_id}:events": last_id},
                block=15_000,
            )

            for event in events:
                yield make_sse(
                    event="event",
                    data=event,
                )

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
    )
```

브라우저 agent 관련 일반 요청은 API를 통해 받는다.

예:

- `POST /sessions/{id}/runs`
- `GET /sessions/{id}`
- `GET /sessions/{id}/runs/{id}`
- `GET /.../events`
- `POST /.../cancel`

Worker는 external ingress에 노출하지 않는다.

---

# 16. Redis command cheat sheet for the series

| Command | Structure | Meaning | Agent backend use |
|---|---|---|---|
| `HSET` | Hash | field update | current state update |
| `HGETALL` | Hash | read full hash | SSE initial snapshot |
| `XADD` | Stream | append entry | event / queue enqueue |
| `XREAD` | Stream | read after ID | SSE event consumption |
| `XREADGROUP` | Stream + Consumer Group | distribute entries among consumers | worker queue consume |
| `XACK` | Consumer Group | acknowledge completion | mark queue work handled |

## Important distinction

```text
run:{id}:state
= current snapshot

run:{id}:events
= user-visible execution history

agent:jobs
= worker execution queue
```

세 개 모두 Redis를 쓰지만 역할이 다르다.

---

# 17. State update vs event update

Worker의 stream handler 예시.

```python
async def handle_stream_part(run_id: str, part: dict):

    if part["type"] == "updates":
        ui_state = map_graph_update_to_ui_state(
            part["data"]
        )

        if ui_state:
            await redis.hset(
                f"run:{run_id}:state",
                mapping=ui_state,
            )

    elif part["type"] == "custom":
        event = part["data"]

        await redis.xadd(
            f"run:{run_id}:events",
            {
                "payload": json.dumps(event)
            },
        )

        if event.get("type") == "progress":
            progress = (
                event["completed"]
                / event["total"]
                * 100
            )

            await redis.hset(
                f"run:{run_id}:state",
                mapping={
                    "progress": progress
                },
            )
```

핵심:

- state = snapshot
- event = history
- 하나의 custom event가 둘 모두를 업데이트할 수 있지만 의미는 다름

---

# 18. Session isolation design notes

## Logical isolation, not pod-per-session

일반적으로:

```text
Session A → Worker Pod A
Session B → Worker Pod B
```

가 아니다.

대신:

```text
             agent:jobs
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
   Worker 1   Worker 2   Worker 3

    S1/R1      S3/R4      S2/R8

next:

    S4/R3      S1/R2      S3/R5
```

모든 worker는 적절한 authorization/internal trust boundary 안에서 어떤 session의 run이든 처리 가능.

Worker는 run을 받은 뒤 session context를 load.

## Session lock

```text
lock:session:{session_id}
```

등으로 하나의 session에 한 active run만 허용하는 초기 설계 가능.

대안:

- optimistic concurrency
- version number
- branch semantics
- event sourcing

초기 글에서는 복잡도를 낮추기 위해 "one active run per session"을 기본안으로 둔다.

---

# 19. Recommended initial Kubernetes deployment

과도하게 쪼개지 않는 초기 production 구성.

```text
Kubernetes Cluster

agent-api Deployment
    replicas: 2–3
    FastAPI

agent-worker Deployment
    replicas: 2–N
    LangGraph
    asyncio

optional:
cpu-worker Deployment
    only for CPU-heavy analysis

optional:
vllm Deployment
    only for self-hosted inference

external / managed:
PostgreSQL
Redis
```

## Why separate scaling?

```text
user traffic ↑
→ API replicas ↑

analysis queue ↑
→ Worker replicas ↑
```

두 workload의 scaling signal이 다르기 때문.

---

# 20. Things not to overclaim

각 글에서 아래를 명확히 한다.

## Redis is not mandatory

- RabbitMQ
- Kafka
- SQS
- Celery broker
- Temporal
- managed agent runtime

등 대체 가능.

이 시리즈는 Redis Streams를 예제로 선택.

## PostgreSQL is not the only durable store

다만:

- relational ownership
- session/run relationships
- JSONB flexibility
- audit/queryability

때문에 좋은 default라는 framing.

## Worker does not automatically mean CPU-heavy

Worker 분리의 핵심은:

- lifecycle
- ownership
- isolation
- scaling
- retry

CPU는 secondary concern.

## Async does not mean multi-core parallelism

event-loop concurrency와 CPU parallelism을 혼동하지 않는다.

## Kubernetes is not mandatory

small system은:

```text
FastAPI process
worker process
Redis
PostgreSQL
```

만으로도 충분할 수 있다.

Kubernetes는 workload scale / operations layer.

## LangGraph is optional

같은 architecture를 pure Python orchestrator로도 구현 가능.

이 점이 시리즈의 중요한 메시지.

---

# 21. Editorial style

이 시리즈는 framework tutorial보다 "system reasoning" 중심.

## Preferred pattern for every article

1. 실제 문제가 먼저 나온다.
2. naive implementation을 보여준다.
3. 왜 깨지는지 설명한다.
4. 시스템 개념을 도입한다.
5. Python / Redis / LangGraph 코드 예시.
6. architecture diagram.
7. production caveat.
8. 다음 편 문제로 연결.

## Avoid

- 처음부터 LangGraph API 나열
- framework marketing language
- unexplained Kubernetes jargon
- "best practice"라고만 쓰고 이유 생략
- 모든 시스템이 Redis/K8s를 써야 한다는 주장
- toy agent만 보여주고 failure mode를 생략

---

# 22. Recurring diagrams

시리즈 내 시각적 일관성을 위해 아래 diagrams를 반복/확장.

## Diagram A — Event loop

```text
Single Thread

Event Loop
  ├─ Task A → await HTTP
  ├─ Task B → await DB
  ├─ Task C → await Redis
  └─ Task D → runnable
```

## Diagram B — API vs Worker

```text
Browser
  ↓
API
  ↓ enqueue
Queue
  ↓
Worker
  ↓
LangGraph
```

## Diagram C — State vs Event

```text
State
status=running
progress=65
current_step=valuation

Events
search_completed
peer_completed
dcf_started
```

## Diagram D — Session hierarchy

```text
Tenant
 └ User
    └ Session
       ├ Run 1
       └ Run 2
```

## Diagram E — End-to-end production

Article 11 canonical diagram 사용.

---

# 23. Possible future articles after the core series

Core 11편 이후 확장 후보.

## 12. Cancellation

- user cancel
- cooperative cancellation
- worker cancellation
- LangGraph interruption
- queue cleanup

## 13. Timeouts and budgets

- per-tool timeout
- total run timeout
- token budget
- cost budget

## 14. Idempotency

- duplicate queue delivery
- external side effects
- idempotency key
- exactly-once illusion

## 15. Checkpoint and Resume

- durable graph checkpoint
- resume after failure
- human-in-the-loop

## 16. Observability

- trace_id
- session_id
- run_id
- structured logs
- metrics
- distributed tracing

## 17. Backpressure

- queue saturation
- admission control
- per-tenant quotas
- concurrency limit

## 18. Multi-agent execution

- parent run / child run
- fan-out
- fan-in
- shared context
- isolation

## 19. Security

- tool permission
- tenant data isolation
- prompt injection boundary
- credential isolation
- secret handling

## 20. Streaming tokens vs progress events

- token stream
- semantic progress
- tool events
- UI rendering strategy

---

# 24. Drafting order recommendation

실제 집필은 1→11 순서가 가장 자연스럽지만 반드시 연재 순서를 완전히 따를 필요는 없다.

권장 첫 묶음:

```text
1 Async
2 Thread / Process
3 Worker
```

여기까지 쓰면 execution foundation 완성.

두 번째 묶음:

```text
4 State
5 State vs Event
6 SSE
```

여기까지 쓰면 frontend-backend realtime model 완성.

세 번째:

```text
7 LangGraph
8 Session
9 Reliability
```

마지막:

```text
10 Kubernetes
11 End-to-End
```

---

# 25. One-line takeaway for each article

1. **Async** — Agent는 계산보다 기다리는 시간이 길기 때문에 async가 중요하다.
2. **Thread / Process** — 기다림과 계산은 서로 다른 concurrency 도구가 필요하다.
3. **Worker** — worker는 thread가 아니라 execution lifecycle의 소유 경계다.
4. **State** — durable state와 hot operational state는 역할이 다르다.
5. **State vs Event** — 현재 상태와 시간순 사건은 같은 데이터가 아니다.
6. **SSE** — browser는 snapshot을 먼저 받고 event를 이어받는 것이 자연스럽다.
7. **LangGraph** — LangGraph는 runtime이지 전체 backend architecture가 아니다.
8. **Session** — 대화 context와 실행 instance는 분리해야 한다.
9. **Reliability** — queue message는 전달보다 완료 확인과 retry가 더 중요하다.
10. **Kubernetes** — API와 worker는 resource profile과 scaling signal이 다르다.
11. **End-to-End** — production agent는 LLM call이 아니라 여러 시스템 경계를 통과하는 stateful request다.

---

# 26. Article brief skeleton to reuse

각 편 작업 시작 시 아래를 복사해서 구체화.

```markdown
## Topic

- Working title:
- One-sentence question:
- Content type: foundation / implementation
- Intended reader:
- Prerequisites:

## Non-negotiable claims

- 
- 
- 

## Concepts

- 
- 
- 

## Naive implementation

...

## Failure mode

...

## Better architecture

...

## Code examples

...

## Diagrams

...

## Production caveats

...

## Bridge to next article

...
```

---

# 27. Final architectural principles

시리즈 전체가 궁극적으로 전달해야 할 원칙.

## Principle 1

> Separate execution from observation.

LangGraph run과 SSE connection은 같은 lifecycle이어야 할 필요가 없다.

## Principle 2

> Separate current state from event history.

Snapshot과 timeline은 서로 다른 read model이다.

## Principle 3

> Separate durable truth from hot operational state.

PostgreSQL과 Redis를 동일한 storage로 생각하지 않는다.

## Principle 4

> A worker is an ownership boundary.

Worker의 존재 이유는 단순 CPU 사용이 아니라 job lifecycle / retry / scale / failure isolation이다.

## Principle 5

> Session isolation is a data and authorization problem before it is a pod problem.

대부분의 시스템에서 session마다 Pod를 만들 필요는 없다.

## Principle 6

> Framework state is not necessarily product state.

LangGraph state, Redis state, browser UI state는 서로 다른 목적의 projection일 수 있다.

## Principle 7

> Production agents are distributed systems.

LLM orchestration만 잘한다고 production agent backend가 완성되는 것은 아니다.

---

# 28. Current preferred implementation baseline

현재 시리즈의 기본 reference stack.

```text
Frontend
  ↓
Ingress / SSO
  ↓
FastAPI
  ↓
PostgreSQL
  ↓
Redis
  ├─ state hash
  ├─ event streams
  └─ job queue
  ↓
Async Worker Deployment
  ↓
LangGraph
  ↓
LLM / DB / tools
```

Redis queue는:

```text
Redis Streams
+ Consumer Group
+ XREADGROUP
+ XACK
```

Session policy는 우선:

```text
one active run per session
```

으로 단순화.

CPU-heavy workload가 실제 나타날 때만:

```text
cpu-worker Deployment
```

추가.

self-hosted inference가 필요할 때만:

```text
vLLM / GPU inference Deployment
```

추가.

---

# 29. Research / verification checklist before publication

각 글 작성 시 최신 공식 문서 확인.

- Python `asyncio`
- CPython GIL / threading docs
- FastAPI StreamingResponse
- Redis Hash / Streams
- Redis consumer groups
- LangGraph streaming API
- LangGraph persistence / thread_id
- Kubernetes Deployment / Job
- KEDA Redis Streams scaler

특히 LangGraph API는 변경 가능성이 있으므로 발행 시점의 최신 문서를 다시 확인한다.

---

# 30. Series positioning

이 시리즈는 다음 독자를 목표로 한다.

- LLM app은 만들어봤지만 backend architecture는 아직 낯선 개발자
- Data Scientist에서 AI Engineer / Agent Engineer로 확장하는 사람
- LangGraph tutorial 다음 단계가 필요한 사람
- prototype에서 production으로 넘어가는 팀

차별점:

> "무슨 프레임워크를 쓰는가"보다 "왜 이 시스템 경계가 필요한가"를 설명한다.

최종 독자가 얻어야 하는 mental model:

```text
Agent backend
=
API layer
+ execution layer
+ state layer
+ event layer
+ persistence layer
+ isolation boundary
+ reliability mechanism
+ deployment layer
```

이 문서를 master blueprint로 두고 각 글을 하나씩 별도 content branch에서 꺼내 작성한다.
