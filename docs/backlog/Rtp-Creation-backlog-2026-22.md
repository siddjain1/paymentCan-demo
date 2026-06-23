# User Stories — RtP Creation API (EPIC-01)

**Epic:** EPIC-01 — Request Initiation and Routing  
**Scope:** Stories covering `POST /rtp/v1/requests` and the downstream routing/delivery flow it triggers

Wave 1 stories are MVP — implement these first. Wave 2 stories require separate endpoints (noted below).

---

## Wave 1 — MVP Stories

---

### Story S1.1 — RtP Creation API Endpoint
**Requirement:** RTP-INIT-001  
**Priority:** Must

**User Story**  
As an originating participant (Payee's FI), I want to submit a pain.013 RtP request via the RTR Exchange API so that my customer's payment request is routed to the payer's financial institution in real time.

**Acceptance Criteria**

- [ ] Given a valid pain.013 XML payload, when submitted to `POST /rtp/v1/requests`, then a 202 response is returned with a globally unique RtP Transaction ID within the RTR Exchange SLA.
- [ ] Given a submitted request, then the request is routed to the payer's participant via account-based routing within the same processing cycle.
- [ ] Given the originating participant is not entitled, when the request is submitted, then a 403 response is returned with reason code `BE01`.

**Dev Tasks**

- [ ] Implement `POST /rtp/v1/requests` endpoint with mTLS participant authentication at API Gateway.
- [ ] Build pain.013 inbound parser and mandatory-field extractor aligned to Payments Canada ISO 20022 spec (`pain.013.001.07`).
- [ ] Implement RtP Transaction ID generator (UUID v4) and atomic persistence to `RtPTransaction` store.
- [ ] Implement account-based routing logic to resolve payer's participant from `DebtorAccount` in pain.013 (use `resolveParticipant()` interface — stub acceptable).
- [ ] Implement synchronous `pain.002` ACCP response with RtP Transaction ID on successful acceptance.

---

### Story S1.2 — Mandatory Field Validation
**Requirement:** RTP-INIT-002  
**Priority:** Must

**User Story**  
As the RTR Exchange, I want to validate all mandatory pain.013 fields synchronously so that malformed requests are rejected immediately with standardised reason codes before any routing occurs.

**Acceptance Criteria**

- [ ] Given a pain.013 missing any mandatory field, when submitted, then a synchronous 400 is returned with ISO reason code `MS03` and the specific missing field identified in `AddtlInf`.
- [ ] Given a pain.013 with an invalid `RequestedExecutionDate` (past date), then 400 + `DT01` is returned.
- [ ] Given a pain.013 with invalid currency (not CAD), then 400 + `AM03` is returned.
- [ ] Given a pain.013 with `InstructedAmount` = 0, then 400 + `AM03` is returned.
- [ ] Given a pain.013 where all mandatory fields are present and valid, then validation passes and processing continues.
- [ ] No routing call is made before all validations pass.

**Dev Tasks**

- [ ] Build field-level validator for all 9 mandatory pain.013 fields with specific reason code mapping per validation type (see `02-requirements.md` table).
- [ ] Implement date validation: `RequestedExecutionDate` must be ≥ today (UTC); `ExpiryDateTime` if present must be > `CreationDateTime`.
- [ ] Implement currency validation: `InstructedAmount/@Ccy` must equal `"CAD"`; amount must be > 0.
- [ ] Implement pain.002 RJCT response builder with `StatusReasonInformation/Reason/Cd` populated from validation failure and `AddtlInf` identifying the failing field.
- [ ] Ensure validator runs **before** duplicate check and routing — fail fast on first validation error.

---

### Story S1.3 — Unique RtP Transaction ID Assignment
**Requirement:** RTP-INIT-003  
**Priority:** Must

**User Story**  
As the RTR Exchange, I want to generate a globally unique RtP Transaction ID for every accepted request so that all participants can unambiguously reference this request throughout its lifecycle.

**Acceptance Criteria**

- [ ] Given any two accepted requests, then their RtP Transaction IDs are globally unique (no collisions under any volume).
- [ ] Given an accepted request, then the RtP Transaction ID is returned synchronously in the pain.002 ACK response (`TxInfAndSts/OrgnlInstrId`).
- [ ] Given the RtP Transaction ID, then it persists in the `RtPTransaction` store and is retrievable for the full lifecycle duration.
- [ ] Given a DB write failure during ID persistence, then the API returns 503 and no ID is returned to the caller.

**Dev Tasks**

- [ ] Implement UUID v4 generator for RtP Transaction ID.
- [ ] Write `RtPTransaction` record atomically — include collision detection (re-generate and retry on UUID collision, max 3 attempts, then 503).
- [ ] Include RtP Transaction ID in the pain.002 ACK response body under `OrgnlPmtInfAndSts/TxInfAndSts/OrgnlInstrId`.
- [ ] Implement atomicity: `RtPTransaction` + `RtPStateTransition` + `RtPMessageStore` must write in a single DB transaction (see `04-data-model.md` Atomicity Requirement).

---

### Story S1.4 — Idempotent Request Creation
**Requirement:** RTP-INIT-004  
**Priority:** Must

**User Story**  
As an originating participant, I want duplicate RtP submissions to be safely rejected so that network retries or processing errors do not result in duplicate payment requests being presented to the payer.

**Acceptance Criteria**

- [ ] Given a request with identical composite key submitted twice within 90 days, then the second submission returns the original RtP Transaction ID (not a new one) with reason code `ED05`.
- [ ] Given the same request submitted after 90 days, then it is treated as a new request and a new ID is issued.
- [ ] Given two requests with the same content but different `MessageIdentification` values, then both are accepted as distinct requests.
- [ ] Given 500 concurrent identical requests, then exactly 1 unique ID is created; all others return the original ID.

**Dev Tasks**

- [ ] Implement composite duplicate detection key: `SHA-256(MessageIdentification + CreationDate(YYYY-MM-DD) + OriginatorParticipantId)`.
- [ ] Persist `duplicateDetectionKey` on `RtPTransaction` with a unique index.
- [ ] Build duplicate lookup against `RtPTransaction` store **before** ID generation — check duplicate key in the same DB transaction to prevent race conditions.
- [ ] Return original `RtpTransactionId` + `ED05` in `pain.002` response body on duplicate detection.
- [ ] Index `duplicateDetectionKey` for sub-millisecond lookup at high throughput.

---

### Story S1.7 — Real-Time Routing to Payer's Participant
**Requirement:** RTP-INIT-007  
**Priority:** Must

**User Story**  
As the RTR Exchange, I want to route the RtP message to the payer's financial institution in real time using account-based routing so that the payer receives the request without delay.

**Acceptance Criteria**

- [ ] Given a valid pain.013, when the Debtor account is resolvable to a known RTR participant, then the pain.013 is routed to that participant's endpoint within the RTR Exchange SLA.
- [ ] Given routing succeeds, then the RtP state transitions from `SUBMITTED` to `DELIVERED` and the originator receives a delivery ACK.
- [ ] Given the Debtor account is not resolvable, then 400 + `AC01` is returned to the originator and no routing is attempted.

**Dev Tasks**

- [ ] Implement account-to-participant resolution using the `resolveParticipant(debtorAccountId)` interface (stub: return hardcoded mapping for test accounts; real implementation consults RTR routing directory).
- [ ] On successful resolution: forward pain.013 to payer FI endpoint; on success update `RtPTransaction.currentState = DELIVERED`; write `RtPStateTransition (SUBMITTED → DELIVERED)`; emit `RTP_DELIVERED` event.
- [ ] On unresolvable account: return 400 + `AC01` pain.002 RJCT **before** writing any records (or rollback if records were written).
- [ ] On routing call timeout: apply retry policy (see S1.8); return 202 to originator after initial acceptance while routing retries asynchronously.

---

### Story S1.8 — Delivery Assurance and Retry
**Requirement:** RTP-INIT-008  
**Priority:** Must

**User Story**  
As an originating participant, I want the RTR Exchange to retry transient delivery failures automatically and notify me if delivery ultimately fails so that I can take remedial action with my customer.

**Acceptance Criteria**

- [ ] Given a transient delivery failure (network timeout, 5xx from payer FI), then the RTR Exchange automatically retries per the configured retry policy.
- [ ] Given retries are exhausted, then the RtP state transitions to `FAILED` and the originator is notified with a standardised error code.
- [ ] Given successful delivery on a retry attempt, then state transitions to `DELIVERED` and the originator is notified.

**Dev Tasks**

- [ ] Implement retry scheduler with configurable policy: max attempts = `RTP_DELIVERY_RETRY_MAX` (default: 3); interval: exponential backoff starting at 1s (configurable).
- [ ] Implement delivery status tracking in `RtPStateTransition` table: record each retry attempt as a transition note.
- [ ] Build `FAILED` state transition: emit `RTP_DELIVERY_FAILED` event; downstream Notification Service sends pain.014 to originator (stub the notification push).
- [ ] Implement dead-letter queue entry for persistently failed deliveries (emit `RTP_DEAD_LETTER` event; stub acceptable).

---

### Story S1.9 — Interoperability, Authentication, and Fixed-Amount Enforcement
**Requirements:** RTP-INIT-009, RTP-INIT-010, RTP-INIT-011  
**Priority:** Must

**User Story**  
As Payments Canada, I want the RtP service to be interoperable across all participant tiers, authenticated at every API boundary, and enforce fixed-amount-only requests so that the service is ubiquitous, secure, and unambiguous for all participants.

**Acceptance Criteria**

- [ ] Given any qualified participant (Direct, Indirect, CSP-enabled), when they submit a valid pain.013, then the service accepts and routes the request without participant-tier-specific behaviour differences.
- [ ] Given an unauthenticated or unauthorised participant, then all API calls return 403 with reason code `BE01`.
- [ ] Given a pain.013 that includes an amount range, minimum amount indicator, or partial-payment flag (non-standard), then it is rejected at XSD validation.
- [ ] Given a valid pain.013 with a single fixed `InstructedAmount`, then it is accepted (no amount type restrictions beyond this).

**Dev Tasks**

- [ ] Configure API Gateway to enforce mTLS and validate participant certificate against RTR Exchange PKI for all RtP endpoints.
- [ ] Implement participant entitlement check: look up `OriginatorParticipantId` (from mTLS cert CN) against RTR Exchange participant registry; return 403 + `BE01` if not found or not active.
- [ ] Integrate Payments Canada XSD schema (`pain.013.001.07`) into inbound validation pipeline; reject any non-conforming message at the boundary with 422 + `MS02`.
- [ ] Test interoperability: integration test set must include submissions from all three participant tier configurations (Direct, Indirect-via-Agent, CSP-connected).

---

## Wave 2 Stories (Implement After MVP)

> These stories require separate endpoints. The data model in `04-data-model.md` already accommodates them — no schema changes needed.

---

### Story S1.5 — Pre-Acceptance Modification
**Requirement:** RTP-INIT-005  
**Priority:** Should  
**Endpoint:** `PATCH /rtp/v1/requests/{rtpTransactionId}`

**User Story**  
As an originating participant, I want to update the remittance information or requested execution date on an in-flight RtP before the payer has acted so that I can correct billing data errors without cancelling and re-submitting.

**Acceptance Criteria**

- [ ] Given an RtP in `DELIVERED` state, when the originator submits a non-financial field amendment, then the payer's FI receives the updated request in real time.
- [ ] Given an RtP in `ACCEPTED`, `DECLINED`, `PAID`, or any other terminal state, when a modification is attempted, then 422 is returned and state is unchanged.
- [ ] Given a modification request that attempts to change `InstructedAmount`, then 400 is returned — amount is immutable.
- [ ] Given a successful modification, then a modification event is appended to `RtPStateTransition` audit log.

**Dev Tasks**

- [ ] Implement `PATCH /rtp/v1/requests/{id}` endpoint.
- [ ] Whitelist modifiable fields: `RemittanceInformation`, `RequestedExecutionDate` only.
- [ ] Validate RtP is in `SUBMITTED` or `DELIVERED` state before applying change; return 422 for all others.
- [ ] Push modified pain.013 to payer's FI in real time; update `RtPTransaction` store.
- [ ] Append `RtPStateTransition` record with modified fields noted in `AddtlInf`.

---

### Story S1.6 — Pre-Acceptance Cancellation
**Requirement:** RTP-INIT-006  
**Priority:** Must (Wave 2)  
**Endpoint:** `POST /rtp/v1/requests/{rtpTransactionId}/cancel`

**User Story**  
As an originating participant, I want to cancel an in-flight RtP before the payer responds so that a billing error or dispute can be resolved without presenting an incorrect request to the payer.

**Acceptance Criteria**

- [ ] Given an RtP in `SUBMITTED` or `DELIVERED` state, when the originator submits a cancellation, then the RtP transitions to `CANCELLED` and the payer's FI is notified in real time.
- [ ] Given a `CANCELLED` RtP, when the payer's FI attempts to submit a response, then 422 + `NARR` is returned.
- [ ] Given a cancellation, then it is recorded in the audit log with timestamp and reason code `CXLD/CUST`.
- [ ] Given a cancellation attempt by a participant other than the originator, then 403 is returned.

**Dev Tasks**

- [ ] Implement `POST /rtp/v1/requests/{id}/cancel` endpoint with originator-only authorisation.
- [ ] Validate cancellation is only permitted for `SUBMITTED` or `DELIVERED` states; return 422 for all others.
- [ ] Transition state to `CANCELLED`; write `RtPStateTransition` with reason code `CXLD/CUST`.
- [ ] Push real-time cancellation notification to payer's FI (emit `RTP_CANCELLED` event; Notification Service delivers pain.013 cancellation).
- [ ] Block subsequent pain.014 responses against this RtP ID at the Response API layer (state guard).
