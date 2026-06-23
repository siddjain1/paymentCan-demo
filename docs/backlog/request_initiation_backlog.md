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
