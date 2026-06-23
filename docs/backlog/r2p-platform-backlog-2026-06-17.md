---
feature: r2p-platform
date: 2026-06-17
status: backlog
---

# Backlog: R2P Platform

## EPICs

---

### EPIC 1: Infrastructure & Foundation

**Summary:** No user journey dependency — executes first and unlocks all downstream work. Covers database schema, ISO 20022 validation middleware, and the POC Address Directory stub.

#### Ticket 1.1 — Database Schema & Migrations
**Type:** Infrastructure
**Points:** 5
**Priority:** High
**Depends on:** none
**Status:** To Do

**Description:**
Create and apply all database migrations for the R2P platform. Covers all tables required by every downstream service.

Tables to create: R2PRequest, R2PStateTransition, R2PAcknowledgement, R2PResponse, R2PPayment, EventSubscription, AuditStore, OutboxEvent.
Include a `version` column on R2PRequest for optimistic locking.
All AuditStore writes must be insert-only (no update/delete permissions on that table).

**Acceptance Criteria:**
- [ ] All 8 tables created with correct columns, types, and constraints
- [ ] Migrations are idempotent and reversible
- [ ] R2PRequest.version column supports optimistic locking
- [ ] AuditStore table has insert-only access enforced at DB level
- [ ] Migrations run cleanly on a fresh database

---

#### Ticket 1.2 — ISO 20022 Validator Middleware
**Type:** Backend API
**Points:** 5
**Priority:** High
**Depends on:** 1.1
**Status:** To Do

**Description:**
Stateless middleware that validates all inbound and outbound messages against the relevant ISO 20022 XSD schemas. Returns structured error codes on failure. Versioned independently of business logic.

Schemas: pain.013 (request initiation), pain.014 (response), camt.087 (modification).
Returns structured error: `{ code: "VALIDATION_ERROR", fields: [...] }` on failure.

**Acceptance Criteria:**
- [ ] Validates pain.013, pain.014, and camt.087 schemas
- [ ] Returns 400 VALIDATION_ERROR with field-level detail on invalid messages
- [ ] Valid messages pass through with no modification
- [ ] Schema version is configurable without touching business logic
- [ ] All unit tests pass

---

#### Ticket 1.3 — Address Directory (POC Stub)
**Type:** Backend API
**Points:** 3
**Priority:** High
**Depends on:** 1.1
**Status:** To Do

**Description:**
In-memory static map that resolves a payer proxy identifier (email, phone, alias) to a routable participant endpoint and account reference. Seeded with 5 test participants for POC.

Endpoint: `GET /internal/address-directory/resolve?proxyType={type}&proxyValue={value}`
Output: `{ participantId, participantEndpoint, accountRef }`

**Acceptance Criteria:**
- [ ] Resolves all 3 proxy types (email, phone, alias) for the 5 seeded participants
- [ ] Returns 404 for unknown proxy values
- [ ] TTL field is present on all resolved entries
- [ ] All unit tests pass

---

### EPIC 2: Payee Journey — Request Initiation

**Summary:** Originating Participant submits, modifies, and cancels R2P requests on behalf of a payee. Covers the three core lifecycle mutation endpoints.

#### Ticket 2.1 — POST /r2p/requests — Create Request
**Type:** Backend API
**Points:** 5
**Priority:** High
**Depends on:** 1.2, 1.3
**Status:** To Do

**Description:**
Core request creation endpoint. Validates all mandatory fields via ISO 20022 Validator, resolves payer address via Address Directory, generates a UUID v7 R2P transaction ID, enforces idempotency via idempotencyKey, persists the request, and transitions status to `created`.

Endpoint: `POST /r2p/requests`
Input: `{ payerId, payeeId, amount, currency, dueDate, expiryTimestamp, remittanceInfo, idempotencyKey }`
Output: `{ r2pId, status: "created", createdAt }`
Errors: 400 VALIDATION_ERROR, 409 DUPLICATE_REQUEST

**Acceptance Criteria:**
- [ ] Returns r2pId (UUID v7) and status "created" on valid input
- [ ] Duplicate idempotencyKey returns 409 DUPLICATE_REQUEST
- [ ] Invalid input returns 400 VALIDATION_ERROR with field detail
- [ ] Request persisted to R2PRequest table with all fields
- [ ] All unit tests pass

---

#### Ticket 2.2 — PATCH /r2p/requests/{id} — Modify Request
**Type:** Backend API
**Points:** 3
**Priority:** Medium
**Depends on:** 2.1
**Status:** To Do

**Description:**
Allows modification of permissible fields on a request before the payer accepts it. Enforces state guard — only `created` or `sent` requests may be modified.

Endpoint: `PATCH /r2p/requests/{r2pId}`
Input: `{ amount?, dueDate?, expiryTimestamp?, remittanceInfo? }`
Output: `{ r2pId, status, updatedAt }`
Errors: 400 VALIDATION_ERROR, 404 NOT_FOUND, 409 INVALID_STATE_TRANSITION

**Acceptance Criteria:**
- [ ] Permissible fields updated correctly for requests in `created` or `sent` state
- [ ] Requests in `delivered` or later state return 409 INVALID_STATE_TRANSITION
- [ ] 404 returned for unknown r2pId
- [ ] Modification recorded in R2PStateTransition and AuditStore
- [ ] All unit tests pass

---

#### Ticket 2.3 — DELETE /r2p/requests/{id} — Cancel Request
**Type:** Backend API
**Points:** 3
**Priority:** Medium
**Depends on:** 2.1
**Status:** To Do

**Description:**
Cancels an active request before acceptance. Enforces state guard — only pre-acceptance states (`created`, `sent`, `delivered`) are cancellable. Triggers participant notification via Event Publisher.

Endpoint: `DELETE /r2p/requests/{r2pId}`
Output: `{ r2pId, status: "cancelled", cancelledAt }`
Errors: 404 NOT_FOUND, 409 INVALID_STATE_TRANSITION

**Acceptance Criteria:**
- [ ] Request transitions to `cancelled` from valid pre-acceptance states
- [ ] Post-acceptance states return 409 INVALID_STATE_TRANSITION
- [ ] Cancellation recorded in R2PStateTransition and AuditStore
- [ ] Receiving participant notified of cancellation
- [ ] All unit tests pass

---

### EPIC 3: Routing Journey — Message Delivery

**Summary:** Platform routes a created R2P message to the resolved receiving participant endpoint, with retry logic for transient failures.

#### Ticket 3.1 — Routing Engine — HTTPS Delivery
**Type:** Backend API
**Points:** 5
**Priority:** High
**Depends on:** 2.1
**Status:** To Do

**Description:**
Receives a validated R2P message and resolved participant endpoint. Delivers the request to the receiving participant via HTTPS POST. Transitions request state from `created` to `sent` on dispatch. Records delivery state (`pending`, `delivered`, `failed`) in AuditStore.

Internal trigger: called by R2P Request Service after creation.
Delivery target: resolved participantEndpoint from Address Directory.

**Acceptance Criteria:**
- [ ] Request delivered to receiving participant endpoint via HTTPS POST
- [ ] Status transitions to `sent` immediately on dispatch
- [ ] Delivery attempt recorded in AuditStore with timestamp
- [ ] HTTP 2xx response from participant marks delivery as `delivered`
- [ ] All unit tests pass

---

#### Ticket 3.2 — Routing Engine — Retry Logic & Failure State
**Type:** Backend API
**Points:** 3
**Priority:** High
**Depends on:** 3.1
**Status:** To Do

**Description:**
Adds exponential backoff retry to the Routing Engine. On non-2xx or timeout, retries up to 3 times with exponential backoff (max 30s total). After all retries exhausted, marks delivery as `failed` and sends a rejection response back to the originating participant.

**Acceptance Criteria:**
- [ ] Retries up to 3 times with exponential backoff on delivery failure
- [ ] Total retry window does not exceed 30 seconds
- [ ] After 3 failures, status transitions to `failed`
- [ ] Originating participant notified of failed delivery
- [ ] All unit tests pass

---

### EPIC 4: Payer Journey — Acknowledgement & Response

**Summary:** Receiving Participant acknowledges delivery of the request, then submits the payer's decision (accept, decline, or defer).

#### Ticket 4.1 — POST /r2p/requests/{id}/acknowledge
**Type:** Backend API
**Points:** 3
**Priority:** High
**Depends on:** 3.1
**Status:** To Do

**Description:**
Acknowledges receipt of a delivered R2P request. Records a timestamped acknowledgement, transitions state from `sent` to `delivered`, and emits an `acknowledged` event to the Event Publisher.

Endpoint: `POST /r2p/requests/{r2pId}/acknowledge`
Input: `{ participantId, receivedAt }`
Output: `{ r2pId, status: "delivered" }`
Errors: 404 NOT_FOUND, 409 ALREADY_ACKNOWLEDGED

**Acceptance Criteria:**
- [ ] Status transitions to `delivered` on valid acknowledgement
- [ ] Timestamped acknowledgement persisted to R2PAcknowledgement table
- [ ] 409 ALREADY_ACKNOWLEDGED returned on duplicate ack
- [ ] `acknowledged` event emitted to Event Publisher
- [ ] All unit tests pass

---

#### Ticket 4.2 — POST /r2p/requests/{id}/respond
**Type:** Backend API
**Points:** 5
**Priority:** High
**Depends on:** 4.1
**Status:** To Do

**Description:**
Receives the payer's response (accept, decline, or defer) from the receiving participant. Routes each response type: accept triggers Payment Execution Engine; decline and defer transition state and notify the originating participant.

Endpoint: `POST /r2p/requests/{r2pId}/respond`
Input: `{ responseType: "accept"|"decline"|"defer", participantId, respondedAt }`
Output: `{ r2pId, status }`
Errors: 400 VALIDATION_ERROR, 404 NOT_FOUND, 409 EXPIRED, 409 INVALID_STATE_TRANSITION

**Acceptance Criteria:**
- [ ] Accept response triggers Payment Execution Engine
- [ ] Decline/defer transitions state and notifies originating participant
- [ ] Response persisted to R2PResponse table
- [ ] Originating participant notified in real time via Event Publisher
- [ ] All unit tests pass

---

#### Ticket 4.3 — Response Validation
**Type:** Backend API
**Points:** 3
**Priority:** High
**Depends on:** 4.2
**Status:** To Do

**Description:**
Enforces all preconditions before a response is accepted. Validates that the request is in `delivered` state, has not expired, and that the response amount (if provided) is within constraints. Rejects invalid responses with structured error codes.

**Acceptance Criteria:**
- [ ] Responses to expired requests return 409 EXPIRED
- [ ] Responses to non-`delivered` requests return 409 INVALID_STATE_TRANSITION
- [ ] Amount out of range returns 400 VALIDATION_ERROR
- [ ] All validation logic covered by unit tests
- [ ] All unit tests pass

---

### EPIC 5: Payment Journey — Execution & Settlement

**Summary:** An accepted R2P response triggers a real-time payment linked to the R2P transaction ID, with stubbed RTR settlement in POC.

#### Ticket 5.1 — Payment Execution Engine — Stubbed RTR Submission
**Type:** Backend API
**Points:** 5
**Priority:** High
**Depends on:** 4.2
**Status:** To Do

**Description:**
Triggered exclusively by an accepted R2P response. Constructs a real-time payment message referencing the R2P transaction ID. Submits to the settlement rail (stubbed: auto-returns success after 500ms). Transitions status from `accepted` to `payment_processing` on submission.

Endpoint: `POST /r2p/payments`
Input: `{ r2pId, paymentAmount, currency, payerId, payeeId }`
Output: `{ paymentId, r2pId, status: "processing" }`
Errors: 400 AMOUNT_MISMATCH, 404 R2P_NOT_FOUND, 409 INVALID_STATE_TRANSITION

**Acceptance Criteria:**
- [ ] Payment message created with R2P transaction ID as linkage reference
- [ ] Status transitions to `payment_processing` on submission
- [ ] Stubbed settlement rail responds with success after 500ms
- [ ] paymentId and r2pId persisted to R2PPayment table
- [ ] All unit tests pass

---

#### Ticket 5.2 — Settlement Confirmation Handling
**Type:** Backend API
**Points:** 3
**Priority:** High
**Depends on:** 5.1
**Status:** To Do

**Description:**
Handles the settlement rail callback. On success, transitions status to `paid` and emits a `paid` event to both participants. On failure, transitions to `payment_failed` and notifies both participants.

**Acceptance Criteria:**
- [ ] Settlement success transitions status to `paid`
- [ ] Settlement failure transitions status to `payment_failed`
- [ ] Both originating and receiving participants notified via Event Publisher
- [ ] All transitions recorded in R2PStateTransition and AuditStore
- [ ] All unit tests pass

---

### EPIC 6: Lifecycle & Observability Journey

**Summary:** Provides status queries, full state history, automatic expiry enforcement, real-time webhook event delivery, and audit trail access for all participants.

#### Ticket 6.1 — GET /r2p/requests/{id} — Status Query
**Type:** Backend API
**Points:** 2
**Priority:** Medium
**Depends on:** 2.1
**Status:** To Do

**Description:**
Returns the current status and full field set for a given R2P request. Available to both originating and receiving participants.

Endpoint: `GET /r2p/requests/{r2pId}`
Output: `{ r2pId, status, payerId, payeeId, amount, currency, dueDate, expiryTimestamp, createdAt, updatedAt }`
Errors: 404 NOT_FOUND

**Acceptance Criteria:**
- [ ] Returns correct current status and all fields for a known r2pId
- [ ] Returns 404 for unknown r2pId
- [ ] All unit tests pass

---

#### Ticket 6.2 — GET /r2p/requests/{id}/history — State History
**Type:** Backend API
**Points:** 2
**Priority:** Medium
**Depends on:** 2.1
**Status:** To Do

**Description:**
Returns the full ordered state transition history for a given R2P request, including actor and timestamp for each transition.

Endpoint: `GET /r2p/requests/{r2pId}/history`
Output: `{ r2pId, transitions: [{ fromState, toState, timestamp, actor }] }`
Errors: 404 NOT_FOUND

**Acceptance Criteria:**
- [ ] Returns all state transitions in chronological order
- [ ] Each entry includes fromState, toState, timestamp, and actor
- [ ] Returns 404 for unknown r2pId
- [ ] All unit tests pass

---

#### Ticket 6.3 — Expiry Scheduler
**Type:** Backend API
**Points:** 3
**Priority:** High
**Depends on:** 2.1
**Status:** To Do

**Description:**
An in-process scheduled job (setInterval, 60s cadence) that queries for all non-terminal R2P requests where `expiryTimestamp < now`, transitions them to `expired`, and emits expiry events to both participants. Uses optimistic locking to avoid race conditions with concurrent response attempts.

**Acceptance Criteria:**
- [ ] Scheduler runs every 60 seconds
- [ ] All non-terminal expired requests transition to `expired`
- [ ] Expiry events emitted to both participants via Event Publisher
- [ ] Optimistic lock conflict on concurrent response returns 409 and scheduler retries
- [ ] All unit tests pass

---

#### Ticket 6.4 — POST /r2p/subscriptions — Event Subscription Management
**Type:** Backend API
**Points:** 3
**Priority:** Medium
**Depends on:** 2.1
**Status:** To Do

**Description:**
Allows participants to register a webhook callback URL and the event types they wish to receive. Persists the subscription to the EventSubscription table.

Endpoint: `POST /r2p/subscriptions`
Input: `{ participantId, callbackUrl, eventTypes: ["delivered","responded","paid","expired","cancelled"] }`
Output: `{ subscriptionId, status: "active" }`
Errors: 400 VALIDATION_ERROR

**Acceptance Criteria:**
- [ ] Valid subscription persisted with status `active`
- [ ] callbackUrl validated as a well-formed HTTPS URL
- [ ] eventTypes validated against allowed set
- [ ] 400 returned for invalid input
- [ ] All unit tests pass

---

#### Ticket 6.5 — Event Publisher — Webhook Delivery
**Type:** Integration
**Points:** 5
**Priority:** High
**Depends on:** 6.4
**Status:** To Do

**Description:**
Delivers real-time state change events to subscribed participants via HTTPS POST webhook. Implements the OutboxEvent pattern: every event is persisted to OutboxEvent table before delivery; marked `delivered` only on HTTP 2xx; a background sweeper retries `undelivered` events with exponential backoff up to 24 hours.

Payload format: ISO 20022-wrapped event envelope.
Events covered: delivered, responded, paid, expired, cancelled.

**Acceptance Criteria:**
- [ ] All state events persisted to OutboxEvent table before delivery attempt
- [ ] HTTP 2xx from participant marks event as `delivered`
- [ ] Non-2xx response triggers background sweeper retry with exponential backoff
- [ ] Retry window covers up to 24 hours
- [ ] All unit tests pass

---

#### Ticket 6.6 — Audit Store Query API
**Type:** Backend API
**Points:** 3
**Priority:** Low
**Depends on:** 1.1
**Status:** To Do

**Description:**
Read-only endpoint allowing participants to retrieve the complete audit trail for a given R2P request — all state transitions, API calls, validation results, and system events.

Endpoint: `GET /r2p/requests/{r2pId}/audit`
Output: `{ r2pId, entries: [{ eventType, actor, timestamp, detail }] }`
Errors: 404 NOT_FOUND

**Acceptance Criteria:**
- [ ] Returns all audit entries for a known r2pId in chronological order
- [ ] Endpoint is strictly read-only (no mutations)
- [ ] Returns 404 for unknown r2pId
- [ ] All unit tests pass

---

## Summary

| | Value |
|---|---|
| Total EPICs | 6 |
| Total Tickets | 19 |
| Total Points | 69 |
| Estimated Sprints | ~4 (at 20 pts/sprint) |

## Execution Order

1. **EPIC 1 — Infrastructure** (no dependencies, start immediately)
2. **EPIC 2 — Payee Request Initiation** (unblocks all downstream EPICs)
3. **EPIC 3 — Routing** (parallel with EPIC 6.1, 6.2, 6.3, 6.4 after EPIC 2)
4. **EPIC 4 — Payer Response** (after routing)
5. **EPIC 5 — Payment Execution** (after payer accept path is live)
6. **EPIC 6 — Lifecycle & Events** (6.1–6.4 parallel with EPIC 3; 6.5 last after 6.4)
