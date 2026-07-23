# Billing & Subscription Ledger Engine — Master Roadmap

**Stack:** TypeScript, Node.js, Express, Prisma 7, PostgreSQL, Redis, BullMQ, Docker
**Total estimated time:** ~14–16 days (core scope)

---

## HOW TO USE THIS DOCUMENT

- Work phase by phase, in order. Don't skip ahead — later phases depend on earlier decisions.
- Each phase has: Prerequisites → Concepts to Learn → Tasks → Common Mistakes → Edge Cases → Interview Topics → Completion Criteria.
- Mark `[ ]` → `[x]` as you go. Don't move to the next phase until "Completion Criteria" is fully checked.

---

## PHASE 0 — Environment & Project Setup

### Prerequisites
- [ ] Node.js + TypeScript basics (you have this)
- [ ] Prisma 7 config pattern (you already know: `prisma.config.js` + driver adapter)

### Concepts to Learn
- [ ] TypeScript strict mode (`strict: true` in tsconfig) — why it matters for a money-handling system
- [ ] Monorepo vs single-service structure — decide: single service is fine for this scope
- [ ] Environment variable validation at boot (fail fast if `DATABASE_URL`/`REDIS_URL`/`WEBHOOK_SECRET` missing) using Zod

### Tasks
- [ ] Init TS project (`tsconfig.json` strict mode, path aliases)
- [ ] Set up Prisma 7 with driver adapter + `prisma.config.js`
- [ ] Set up Zod-based env validation module (single source of truth for config)
- [ ] Docker Compose skeleton: `postgres`, `redis`, `app` services (no app logic yet)
- [ ] ESLint + Prettier config
- [ ] Folder structure decision: `src/modules/{auth,plans,ledger,webhooks,dunning}`, `src/lib`, `src/jobs`

### Common Mistakes
- Not validating env vars at startup → runtime crashes deep in request handling instead of at boot
- Loose TS config (`any` everywhere) — defeats the purpose of using TS for this project

### Completion Criteria
- [ ] `docker compose up` boots empty app + Postgres + Redis with no errors
- [ ] Env validation throws clear error if a required var is missing

---

## PHASE 1 — Auth & Multi-Tenancy Foundation

### Prerequisites
- Phase 0 complete
- You already know JWT from Blog API project

### Concepts to Learn
- [ ] **Multi-tenancy models**: row-level (single DB, `organizationId` column on every table) vs schema-level vs DB-per-tenant. You'll use row-level (simplest, most common at this scale).
- [ ] **Tenant isolation enforcement** — why every single query must be scoped, and where that scoping should live (middleware vs repository layer)
- [ ] RBAC refresher: role stored where (JWT claim vs DB lookup per request) — tradeoffs

### Tasks
- [ ] User + Organization models (`Organization`, `User` with `organizationId`, `role`)
- [ ] JWT auth (access + refresh token pattern)
- [ ] Middleware: extract `organizationId` from authenticated user, attach to `req`
- [ ] Enforce tenant scoping helper — a single function/pattern all queries go through, so it's impossible to forget `where: { organizationId }`
- [ ] Role guard middleware (admin vs customer)

### Common Mistakes
- Forgetting `organizationId` filter on even ONE query → cross-tenant data leak (this is a classic real-world bug class — treat it seriously)
- Trusting `organizationId` from request body/params instead of deriving it from the authenticated token

### Edge Cases
- [ ] User belongs to zero organizations (signup flow)
- [ ] Admin needs cross-tenant access for support/ops — design an explicit "superadmin" path, don't bypass tenant scoping silently

### Interview Topics
- How do you prevent cross-tenant data leaks at the code level (not just "we filter by orgId")?
- Row-level vs schema-level multi-tenancy tradeoffs

### Completion Criteria
- [ ] Two test organizations exist; querying as Org A can never see Org B's data (write a test proving this)
- [ ] JWT refresh flow works end-to-end

---

## PHASE 2 — Plans & Subscriptions

### Prerequisites
- Phase 1 complete (tenant scoping in place)

### Concepts to Learn
- [ ] **State machines** — subscription status transitions as an explicit finite set: `TRIALING → ACTIVE → PAST_DUE → SUSPENDED → CANCELLED`. No status change should be a free-for-all field update; every transition should go through a function that validates "is this transition legal from the current state?"
- [ ] **Proration math** — time-based partial billing when a plan changes mid-cycle
- [ ] Soft deletes vs hard deletes for plans (you already used soft deletes in ShipFlow — same pattern applies to `Plan`, never hard-delete something referenced by historical invoices)

### Tasks
- [ ] `Plan` model (name, price, billing interval, features/limits)
- [ ] `Subscription` model (organizationId, planId, status, currentPeriodStart/End)
- [ ] Subscribe endpoint (create subscription, set initial period)
- [ ] Upgrade/downgrade endpoint with proration calculation
- [ ] Cancel endpoint (immediate vs "cancel at period end" — implement both, discuss tradeoff)
- [ ] Explicit state transition function: `transitionSubscription(sub, newStatus)` that throws on illegal transitions

### Common Mistakes
- Allowing direct `status` field updates anywhere in the codebase instead of funneling through one transition function
- Proration math using naive day counts without accounting for variable month lengths
- Storing computed "next billing date" without a way to recompute it if logic changes later

### Edge Cases
- [ ] Downgrade to a plan with lower usage limits while usage this period already exceeds the new limit — what happens?
- [ ] Upgrade and downgrade on the same day (double proration)
- [ ] Cancel a subscription that's already `PAST_DUE`
- [ ] Timezone handling for billing period boundaries

### Interview Topics
- Why model subscription status as an explicit state machine instead of a free-text/enum field with ad-hoc updates?
- How would you design proration to be auditable (i.e., you can explain to a customer exactly why they were charged X)?

### Completion Criteria
- [ ] All state transitions are unit tested, including rejected illegal transitions
- [ ] Proration produces correct output for at least 3 manually-verified scenarios

---

## PHASE 3 — The Ledger Core (Most Critical Phase)

### Prerequisites
- Phase 2 complete
- Comfortable with Prisma transactions (`$transaction`) — you used this pattern in ShipFlow

### Concepts to Learn
- [ ] **Double-entry accounting fundamentals** — every transaction produces a debit row and a credit row; balance is never stored directly, always derived
- [ ] **Immutability / append-only tables** — no `UPDATE` or `DELETE` on ledger entries, ever. Corrections happen via new offsetting entries, not edits.
- [ ] **ACID guarantees inside a single DB transaction** — why the debit+credit pair MUST be written atomically (if one write succeeds and the other fails, your books are broken)
- [ ] **Balance derivation strategies**: compute-on-read (`SUM` query) vs cached running balance with periodic reconciliation — know both, implement compute-on-read first
- [ ] **Reconciliation** — a background job that periodically verifies `SUM(all debits) == SUM(all credits)` system-wide, catching bugs early

### Tasks
- [ ] `Account` model (represents wallet, revenue account, etc. — at least `user_wallet` and `platform_revenue` account types)
- [ ] `LedgerTransaction` model (groups a debit+credit pair, has a `reference` and `idempotencyKey`)
- [ ] `LedgerEntry` model (immutable row: accountId, type DEBIT/CREDIT, amount, transactionId)
- [ ] Core `recordTransaction()` function: wraps debit+credit write in a single DB transaction, never allows one without the other
- [ ] `getBalance(accountId)` function: derives balance from `SUM(credits) - SUM(debits)`
- [ ] Reconciliation job: scheduled check that global debits == global credits
- [ ] Decide and document money representation: **integer minor units (cents), never floating point**

### Common Mistakes
- Storing money as `Float`/`Decimal` with floating point arithmetic → rounding errors compound over time. Use integers (cents) or a fixed-precision decimal type.
- Writing debit and credit as two separate, non-transactional DB calls
- Allowing any code path to `UPDATE` a ledger entry after creation
- Not indexing `accountId` + `createdAt` — balance queries will be slow at scale without this

### Edge Cases
- [ ] Concurrent transactions on the same account (two charges at once — does your balance calculation race?)
- [ ] Negative balance scenarios — is it ever legal? Define explicitly.
- [ ] Reversal/refund — implemented as a new offsetting transaction, never as deleting/editing the original
- [ ] Currency handling if you support more than one currency (even if you don't implement multi-currency, document the assumption that you're single-currency)

### Interview Topics
- Why double-entry over a single mutable balance column? (Be ready to explain with a concrete failure scenario)
- How do you guarantee atomicity of the debit/credit pair?
- How would you detect a ledger bug in production before a customer does? (→ reconciliation job)
- Why integers/cents instead of floats for money?

### Completion Criteria
- [ ] `recordTransaction()` is fully tested including a forced-failure test (simulate one write failing, confirm the other is rolled back)
- [ ] Reconciliation job runs and passes on seeded data
- [ ] Load test: fire concurrent transactions at one account, confirm final balance is correct (no lost updates)

---

## PHASE 4 — Webhook Simulation & Idempotency

### Prerequisites
- Phase 3 complete (ledger must exist before payment events can post to it)
- You already know idempotency patterns from the Notification Engine — this phase raises the stakes because money is involved

### Concepts to Learn
- [ ] **HMAC signature verification** — how a sender proves a payload is authentic and untampered
- [ ] **Timing-safe comparison** — why naive string equality for signature checks is a security bug
- [ ] **Idempotency keys** — using a unique event ID to guarantee an event is processed exactly once even under retries
- [ ] **At-least-once delivery semantics** — webhooks from real providers (and your simulator) may arrive more than once, out of order, or be delayed; your system must be correct under all three conditions
- [ ] **Out-of-order event handling** — using event timestamps/sequence numbers to reject stale events

### Tasks
- [ ] Build a self-contained "fake payment gateway" module that emits events (`payment.succeeded`, `payment.failed`) with HMAC-signed payloads
- [ ] Webhook receiving endpoint: verify signature → check idempotency key → process → record processed key
- [ ] `ProcessedWebhookEvent` model (idempotencyKey unique constraint — let the DB enforce it, don't only rely on application-level checks)
- [ ] Wire `payment.succeeded` → call `recordTransaction()` from Phase 3
- [ ] Wire `payment.failed` → trigger dunning flow (Phase 5)
- [ ] Return correct HTTP status codes so your fake gateway's retry logic behaves like a real one (200 = don't retry, 5xx = do retry)

### Common Mistakes
- Checking idempotency key in application code only (race condition: two requests arrive simultaneously, both pass the check before either writes) — use a DB unique constraint as the real guard
- Returning 200 before processing is actually complete/committed
- Not verifying signature before parsing/trusting payload contents
- Using `===` instead of a timing-safe comparison for signatures

### Edge Cases
- [ ] Same event delivered twice within milliseconds (race condition test)
- [ ] Event arrives with a valid signature but an old/already-superseded timestamp
- [ ] Malformed payload with a technically-valid signature (signature covers exactly what bytes?)
- [ ] Webhook endpoint receiving events for a subscription that no longer exists

### Interview Topics
- Walk through what happens if your webhook processing crashes halfway through — after signature check, before DB commit
- Why is a DB unique constraint a stronger guarantee than an application-level "check then insert"?
- How do you simulate/test "at-least-once" delivery in a test suite?

### Completion Criteria
- [ ] Duplicate event test passes (send same event 5x concurrently, exactly one ledger transaction results)
- [ ] Invalid signature is rejected with no processing side effects
- [ ] Full round trip works: simulated payment event → ledger entry appears correctly

---

## PHASE 5 — Dunning (Failed Payment Retry Logic)

### Prerequisites
- Phase 4 complete (dunning is triggered by `payment.failed` events)
- You already know BullMQ producer/consumer, retry/backoff, DLQ from the Notification Engine

### Concepts to Learn
- [ ] **Exponential backoff scheduling** applied to a business process, not just infra retries — this is scheduled business logic, not a technical retry
- [ ] Linking BullMQ job state to your subscription state machine (Phase 2) — the job's progress and the subscription's status must stay in sync
- [ ] **Grace periods** — real SaaS products don't suspend instantly; model an explicit grace window

### Tasks
- [ ] BullMQ queue: `dunning-retry` with delayed jobs (1hr → 6hr → 24hr, or your chosen schedule)
- [ ] On `payment.failed`: subscription → `PAST_DUE`, enqueue first retry job
- [ ] On retry: attempt reprocessing (simulated), on failure enqueue next delay, on final failure → `SUSPENDED`
- [ ] On successful retry: subscription → `ACTIVE`, cancel any pending retry jobs for that subscription
- [ ] Notification hook (reuse patterns from your existing Notification Engine) — notify customer at each dunning stage

### Common Mistakes
- Not canceling pending retry jobs when payment succeeds out-of-band (job fires later and incorrectly re-triggers logic)
- Losing track of "how many attempts so far" if the job process restarts (persist attempt count in DB, not just in job data)
- Suspending a subscription without a way to reactivate cleanly once payment succeeds later

### Edge Cases
- [ ] Customer pays manually while a retry job is still pending
- [ ] Worker process crashes mid-retry — does the job resume correctly on restart?
- [ ] Subscription is canceled by the user while dunning is in progress

### Interview Topics
- How do you keep a background job queue's state consistent with your primary database's state?
- What happens to in-flight jobs if you deploy a new worker version?

### Completion Criteria
- [ ] Full dunning cycle test: failed payment → 3 retries → suspension, verified against real elapsed/simulated time
- [ ] Early success cancels remaining scheduled retries (test this explicitly)

---

## PHASE 6 — Invoicing & Reporting

### Prerequisites
- Phases 3–5 complete (invoices summarize ledger data)

### Concepts to Learn
- [ ] Generating a document (PDF or structured JSON) from immutable ledger data — invoices should be a **read/projection** of the ledger, never a separate source of truth
- [ ] Basic aggregation queries for reporting: MRR (Monthly Recurring Revenue), churn count, active subscriptions

### Tasks
- [ ] Invoice generation per billing cycle (pulls ledger entries for that period)
- [ ] Store generated invoice as an immutable snapshot (don't regenerate/recompute a past invoice differently later, even if logic changes)
- [ ] Admin reporting endpoints: MRR, active subscriptions count, failed payment rate

### Common Mistakes
- Recomputing historical invoices live from current logic (a bug fix today silently changes yesterday's invoice) — snapshot at generation time instead

### Completion Criteria
- [ ] Invoice for a test subscription matches manually-calculated expected ledger totals

---

## PHASE 7 — Testing, Docker, Observability, Polish

### Prerequisites
- All prior phases functionally complete

### Concepts to Learn
- [ ] Unit vs integration tests — what to test at each level for a financial system (unit: proration math, balance derivation; integration: full webhook → ledger → dunning flow)
- [ ] Structured logging (why `console.log` is insufficient for a system where "what happened to this transaction" must be traceable)
- [ ] Basic health checks and readiness probes for Docker

### Tasks
- [ ] Unit tests: proration, balance derivation, state transitions
- [ ] Integration tests: full webhook-to-ledger flow, duplicate webhook handling, dunning cycle
- [ ] Structured logger with request/transaction correlation IDs
- [ ] Dockerize fully (multi-stage build, matches your prior projects' patterns)
- [ ] `docker-compose.yml` finalized: app, worker (dunning), Postgres, Redis
- [ ] README: architecture diagram, "why double-entry ledger" section, "why idempotent webhooks" section, setup instructions
- [ ] Swagger/API docs (you already do this for ShipFlow — same standard here)

### Common Mistakes
- Testing only happy paths — for a financial system, the failure/edge-case tests matter more than happy-path tests
- No correlation ID — makes debugging a specific transaction's full lifecycle painful

### Completion Criteria
- [ ] `docker compose up` runs the entire system (API + worker + DB + Redis) from a clean clone
- [ ] Test suite passes, covering at least: ledger atomicity, duplicate webhook rejection, dunning cycle, proration
- [ ] README is complete enough that a stranger could run and understand the project in under 10 minutes

---

## MASTER CONCEPT CHECKLIST (cross-phase reference)

Use this as a standalone study list — check off once you can explain each *without* looking anything up.

**Data & Money Handling**
- [ ] Integer/cents-based money representation vs floating point
- [ ] Double-entry accounting (debit/credit pairs)
- [ ] Immutable/append-only data modeling
- [ ] Balance derivation (compute-on-read vs cached)
- [ ] Reconciliation jobs

**Concurrency & Consistency**
- [ ] ACID transactions (Prisma `$transaction`)
- [ ] Race conditions in concurrent balance updates
- [ ] Strong vs eventual consistency tradeoffs
- [ ] DB unique constraints as concurrency guards

**Distributed Systems Reliability**
- [ ] Idempotency keys
- [ ] At-least-once delivery semantics
- [ ] Out-of-order event handling
- [ ] HMAC signature verification + timing-safe comparison
- [ ] Exponential backoff for retries

**Domain Modeling**
- [ ] Finite state machines for status fields (subscription lifecycle)
- [ ] Multi-tenancy (row-level isolation)
- [ ] Proration math
- [ ] Soft deletes for referenced entities

**Systems/Infra**
- [ ] BullMQ delayed jobs + worker/job state consistency
- [ ] Structured logging + correlation IDs
- [ ] Health checks / readiness probes
- [ ] Docker multi-service orchestration

---

## FULL INTERVIEW-READY TALKING POINTS (prep these as short verbal answers)

- [ ] "Walk me through what happens when a payment webhook comes in" — full flow, signature → idempotency → ledger → state update
- [ ] "Why not just have a `balance` column?" — with a concrete bug scenario as the answer
- [ ] "How do you know your books are correct?" — reconciliation job
- [ ] "What if the same webhook arrives twice?" — DB constraint + idempotency key
- [ ] "How do you handle a subscription upgrade mid-cycle?" — proration walkthrough
- [ ] "What happens if a payment keeps failing?" — dunning state machine walkthrough
- [ ] "How is tenant data isolated?" — row-level scoping enforcement pattern
- [ ] "Why cents/integers instead of floats?" — floating point rounding error example

---

## FINAL SHIP CHECKLIST (before calling it done)

- [ ] All 7 phases' completion criteria checked
- [ ] README with architecture diagram present
- [ ] `docker compose up` works from a fresh clone with no manual steps
- [ ] At least the interview talking points above can be explained out loud, unscripted
- [ ] Pushed to GitHub (HuzaifaJawed77) with clear commit history (not one giant commit)
- [ ] Scope-creep check: dunning/invoicing/proration all present but nothing beyond this list added — resist extending scope further before applying
