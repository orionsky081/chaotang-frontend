# Frontend REST-Only Backend Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every frontend-owned business persistence path, non-REST frontend/backend channel, direct upstream call, and active frontend business runtime so FastAPI is the sole business/data owner.

**Architecture:** Browser code calls same-origin JSON endpoints; Next route handlers are thin adapters around one `backendFetch` gateway; FastAPI owns domain services, providers and SQLAlchemy persistence. Long operations return a task identifier and are observed through REST polling.

**Tech Stack:** Next.js 16, TypeScript, Node test runner, FastAPI, Pydantic, SQLAlchemy, Alembic, pytest.

---

### Task 1: Architecture boundary regression gate

**Files:**
- Create: `frontend/src/lib/architecture/rest-backend-boundary.nodetest.ts`
- Create: `frontend/src/lib/architecture/rest-backend-boundary-bypass.nodetest.ts`
- Modify: `frontend/package.json`

- [ ] Write a failing scanner test that rejects active frontend filesystem writes, browser business persistence, WebSocket/Socket.IO/SSE, direct provider/legacy/legal upstreams, and client imports from CourtOS runtime modules.
- [ ] Add permanent attack fixtures for disguised `fs/promises.open().appendFile`, a re-exported Socket.IO client, dynamic `globalThis['EventSource']`, absolute `fetch` to a non-backend upstream, and a client import through a local barrel.
- [ ] Run the two tests directly and record the expected violations before implementation.
- [ ] Keep the tests out of the aggregate green gate until the violations have been removed; add them to `test:guards` only at Task 7.

### Task 2: Backend business record/event foundation

**Files:**
- Modify: `backend/src/db/models.py`
- Create: `backend/alembic/versions/021_business_records.py`
- Create: `backend/src/db/business_record_store.py`
- Test: `backend/tests/test_business_record_store.py`
- Modify: `backend/tests/test_alembic_migration_chain.py`

- [ ] Write failing tests for tenant isolation, optimistic revision checks, idempotent upsert, ordered listing, append-only events and per-aggregate hash-chain verification.
- [ ] Run the target pytest file and confirm missing models/store failures.
- [ ] Add `BusinessRecord` and `BusinessEvent`, a linear Alembic migration from `020_boss_ledger`, and the minimal store implementation.
- [ ] Run store tests plus migration-chain and schema-drift tests to green.

### Task 3: Move remaining business persistence behind domain REST

**Files:**
- Create: `backend/web/routers/business_records.py`
- Create: `backend/web/routers/build_ledger.py`
- Create: `backend/web/routers/hanlin.py`
- Create: `backend/web/routers/governance.py`
- Modify: `backend/web/main.py`
- Test: `backend/tests/test_business_record_api.py`
- Modify: corresponding frontend stores/routes under `frontend/src/app/api`, `frontend/src/features/**/store*`, and `frontend/src/lib/audit/**`

- [ ] Write API tests proving auth-derived tenant/user ownership and rejecting caller-supplied ownership.
- [ ] Write domain tests for legal build-ledger transitions, Hanlin contribution/review updates, governance optimistic locking, and lesson recall.
- [ ] Implement backend domain endpoints using `business_record_store`; no endpoint accepts an arbitrary namespace.
- [ ] Replace frontend file/localStorage stores with REST clients or page-local ephemeral state.
- [ ] Delete `/tmp`, `.chaotang`, JSON/JSONL business persistence and fail-open local fallbacks from active frontend source.
- [ ] Run target backend tests and affected frontend node tests.

### Task 4: REST-only transport cutover

**Files:**
- Modify: `frontend/src/components/WsEventBridge.tsx` and `frontend/src/app/layout.tsx`
- Delete: `frontend/src/lib/socket.ts`
- Delete/replace: frontend SSE adapters and SSE route handlers found by the Task 1 scanner
- Modify: affected hooks under `frontend/src/features/**/hooks`
- Modify: `frontend/package.json`, `frontend/pnpm-lock.yaml`, `frontend/deploy/env.example`

- [ ] Write failing polling tests for terminal completion, 404 termination, retry/backoff and cancellation.
- [ ] Replace the global Socket.IO bridge with bounded REST polling of backend observability events.
- [ ] Replace task/progress EventSource consumers with existing backend status GET endpoints.
- [ ] Replace streaming chat/manor routes with synchronous JSON or `202 + taskId` REST flows.
- [ ] Remove Socket.IO/SSE source, dependency and environment variables.
- [ ] Run polling tests and the architecture scanner.

### Task 5: Remove direct upstreams and frontend business execution

**Files:**
- Modify: `frontend/src/lib/upstreams.ts`
- Modify: `frontend/src/lib/courtos/server-backend.ts`
- Modify/delete: active frontend LLM/provider, legacy CourtOS and legal-agent callers
- Modify: active client files importing `frontend/src/core/courtos/**`
- Create/modify: backend REST endpoints needed by those pages

- [ ] Write backend endpoint tests before each migrated decision/orchestration behavior.
- [ ] Make `SWARM_BACKEND` the only frontend server upstream and `backendFetch` the only outbound gateway.
- [ ] Move provider/legal/external calls into FastAPI adapters.
- [ ] Replace active client CourtOS decision calls with backend REST responses; keep only presentation formatting and shared contract types in frontend.
- [ ] Delete or attic runtime modules that have no active consumer after cutover.
- [ ] Run backend target tests, frontend `test:core` replacement tests and the architecture scanner.

### Task 6: Deployment/config ownership correction

**Files:**
- Modify: `frontend/docker-compose.yml`
- Modify: `frontend/.gitignore`, `frontend/.dockerignore`
- Modify: `frontend/scripts/package-release.mjs`
- Modify: relevant deployment documentation

- [ ] Move the persistent data volume and provider environment to the backend service.
- [ ] Remove frontend DB artifact handling that would imply a local database can return.
- [ ] Add a configuration test/guard that rejects database volumes or provider secrets on the frontend service.
- [ ] Run Docker/config guards and the architecture scanner.

### Task 7: Gate wiring and full verification

**Files:**
- Modify: `frontend/package.json`
- Modify: `.github/workflows/ci.yml` only if the existing aggregate commands do not already cover the new gate
- Modify: `scripts/gate_selfcheck.py` if a workflow step changes

- [ ] Add both architecture tests to `test:guards` and update the guard heartbeat/meta-assertion.
- [ ] Run `cd frontend && pnpm test:guards`.
- [ ] Run `cd frontend && pnpm exec tsc --noEmit`.
- [ ] Run `cd frontend && pnpm build`.
- [ ] Run backend target pytest files and `cd backend && python3 scripts/validate_flows.py --skip-quality`.
- [ ] Run `python3 scripts/gate_selfcheck.py` from the repository root.
- [ ] Perform fresh reverse searches for DB/file-store terms, storage APIs, WebSocket/SSE, direct upstream envs and active CourtOS runtime imports; any hit must be either removed or documented as test/contract text rather than executable behavior.
- [ ] Review `git diff --check`, `git status --short`, and the exact diff without committing; project rule §15 forbids automatic commits.
