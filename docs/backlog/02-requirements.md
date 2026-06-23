# Functional Requirements — RtP Creation API

**Source:** Payments Canada RTR Release 2 — Request-to-Pay Business Requirements Document  
**Pillar:** Pillar 1 — Request Initiation and Routing  
**Priority legend:** `Must` = mandatory for MVP; `Should` = Wave 2 enhancement

All requirements apply to the `POST /rtp/v1/requests` endpoint unless otherwise noted.

---

## Core API and Validation

### RTP-INIT-001 — RtP Creation API Exposure
**Priority:** Must

The RTR Exchange shall expose a **Request-to-Pay creation API** allowing an originating participant to submit a standardised payment request on behalf of a payee or biller, with all data elements aligned to the Payments Canada `pain.013` message specification.

- The API must accept the full pain.013 XML payload
- The API must be reachable by all qualified RTR participant tiers (Direct, Indirect, CSP-connected)
- The API must not require proprietary extensions beyond the published Payments Canada ISO 20022 spec

---

### RTP-INIT-002 — Mandatory Field Validation
**Priority:** Must

The RTR Exchange shall validate all mandatory `pain.013` fields synchronously at the API boundary and return an ISO 20022 reason code immediately on any validation failure. No routing shall occur before validation passes.

**Fields subject to mandatory validation:**

| Field | Validation Rule | Failure Reason Code |
|-------|----------------|-------------------|
| `MessageIdentification` | Present, non-empty, max 35 chars | `MS03` |
| `CreationDateTime` | Present, valid ISO 8601 datetime | `MS03` |
| `RequestedExecutionDate` | Present, valid date, must be ≥ today | `DT01` |
| `ExpiryDateTime` | If present: must be > CreationDateTime | `DT01` |
| `Creditor` (name + account) | Present, non-empty | `MS03` |
| `Debtor` (name + account) | Present, non-empty | `MS03` |
| `InstructedAmount` | Present, > 0, Currency = "CAD" | `AM03` |
| `RemittanceInformation` | Present, non-empty | `MS03` |
| `PmtInfId` | Present, non-empty, max 35 chars | `MS03` |

All validation failures return HTTP `400` with a `pain.002 RJCT` response body containing `StatusReasonInformation`.

---

### RTP-INIT-003 — Unique RtP Transaction ID Assignment
**Priority:** Must

The RTR Exchange shall assign a **globally unique RtP Transaction ID** to every accepted request and return it synchronously in the `pain.002` ACK response. The ID must:

- Be globally unique across all time and all participants
- Be returned to the originating participant in the same HTTP response as the 202 ACK
- Be persisted to the `RtPTransaction` store atomically before the response is returned
- Serve as the single reference for all subsequent messages (pain.014, pacs.008, pacs.002, status queries)

---

### RTP-INIT-004 — Idempotent Request Creation (Duplicate Detection)
**Priority:** Must

The RTR Exchange shall detect and safely handle duplicate pain.013 submissions. A duplicate is defined as a request where the composite key matches an existing record within the lookback window.

**Composite duplicate key:**
```
hash( MessageIdentification + CreationDate (date part only) + OriginatorParticipantId )
```

**Lookback window:** 90 calendar days (configurable via `RTP_DUPLICATE_WINDOW_DAYS`)

**Behaviour on duplicate:**
- Return the **original** RtP Transaction ID (do not create a new record)
- Return HTTP `200` (or `409` per scheme guidance — see `03-api-spec.md`)
- Include reason code `ED05` in the response

---

### RTP-INIT-007 — Real-Time Account-Based Routing
**Priority:** Must

The RTR Exchange shall route the accepted `pain.013` to the payer's financial institution in real time using account-based routing. Routing must:

- Resolve the payer's RTR participant from the `DebtorAccount` in the pain.013
- Deliver the pain.013 to the resolved participant's endpoint
- Return a delivery acknowledgement to the originating participant
- Transition the RtP state from `Submitted` to `Delivered` on successful delivery
- Reject with `AC01` if the Debtor account is not resolvable to a known participant

---

### RTP-INIT-008 — Delivery Assurance and Retry
**Priority:** Must

The RTR Exchange shall automatically retry transient delivery failures and notify the originating participant if delivery ultimately fails.

- Retry policy is configurable (`RTP_DELIVERY_RETRY_MAX`, retry interval TBD pending RTR Release 2 rules)
- On persistent failure: transition to `Failed` state; push pain.014 status notification to originating participant
- On successful retry: transition to `Delivered`; push delivery ACK to originating participant
- Dead-letter queue for persistently failed deliveries with operator alerting

---

### RTP-INIT-009 — Cross-Participant Interoperability
**Priority:** Must

The RtP Creation API shall be interoperable across all RTR participant tiers without tier-specific behaviour or proprietary message extensions. A Direct participant and a CSP-connected Indirect participant must receive identical processing.

---

### RTP-INIT-010 — Participant Authentication and Authorisation
**Priority:** Must

All requests to the Creation API shall be authenticated via mTLS. The participant certificate CN must match the `OriginatorParticipantId` in the message. Requests from unauthenticated or unauthorised participants are rejected before any processing occurs.

- Unauthenticated (no certificate): reject at TLS handshake, no application log
- Unauthorised (valid cert, no RTR entitlement): HTTP `403` + reason code `BE01`
- Certificate CN mismatch: HTTP `403` + reason code `BE01`

---

### RTP-INIT-011 — Fixed-Amount Enforcement
**Priority:** Must

The Creation API shall only accept fixed-amount requests. The `InstructedAmount` in the pain.013 represents the exact amount the payer must pay if they accept. The API must reject any pain.013 that contains amount ranges, minimum amounts, or partial-payment flags.

Partial acceptance is not permitted anywhere in the RtP flow. Enforcement at creation time prevents ambiguous requests from entering the system.

---

## Wave 2 Requirements (Enhancement — Implement After MVP)

### RTP-INIT-005 — Pre-Acceptance Modification of Non-Financial Fields
**Priority:** Should

The RTR Exchange should allow an originating participant to update the `RemittanceInformation` or `RequestedExecutionDate` on an in-flight RtP **before** the payer has responded.

- Only permitted when RtP is in `Submitted` or `Delivered` state
- `InstructedAmount` must never be modifiable
- Modified request delivered to payer's FI in real time
- Modification event appended to audit log

> **Note:** This requires a separate `PATCH /rtp/v1/requests/{id}` endpoint. Out of scope for the initial `POST` implementation.

---

### RTP-INIT-006 — Pre-Acceptance Cancellation by Originator
**Priority:** Must (Wave 2)

The RTR Exchange shall allow an originating participant to cancel an in-flight RtP before the payer has responded.

- Only permitted when RtP is in `Submitted` or `Delivered` state
- Transitions state to `Cancelled` (terminal)
- Payer's FI notified in real time via pain.013 cancellation message
- All subsequent pain.014 response attempts against the Cancelled RtP ID return `422 + NARR`

> **Note:** This requires a separate `DELETE /rtp/v1/requests/{id}` (or `POST /rtp/v1/requests/{id}/cancel`) endpoint. Out of scope for the initial `POST` implementation but the data model must accommodate it.

---

## Non-Functional Requirements (Applicable to This API)

| NFR | Requirement | Source |
|-----|-------------|--------|
| Availability | 99.999% uptime; no planned downtime windows | RTP-NFR-001 |
| Performance | Submission → ACK response within RTR Exchange messaging SLA | RTP-NFR-002 |
| Performance | SCT settlement SLA of ≤ 10 seconds must not be breached by RtP messaging overhead | RTP-NFR-002 |
| Security | TLS 1.3 minimum; mTLS participant authentication | RTP-NFR-003 |
| Security | Participant certificate CN must match message OriginatorParticipantId | RTP-NFR-003 |
| Data Residency | All persisted RtP data must remain within Canada | RTP-NFR-003 |
| Observability | Submission volumes, error rates, and state transition rates emitted as metrics scoped by participantId | RTP-NFR-006 |
| Schema | All inbound messages validated against Payments Canada ISO 20022 XSD at the API boundary | RTP-LIFE-011 |
