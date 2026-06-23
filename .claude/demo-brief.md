# Agent Brief — RtP Creation API

## What You Are Building

You are implementing the **Request-to-Pay (RtP) Creation API** for Payments Canada's Real-Time Rail (RTR) platform.

This is a single REST endpoint — `POST /rtp/v1/requests` — that allows a payee's financial institution to submit a structured payment request on behalf of a biller or payee. The request is validated, assigned a unique transaction ID, and routed in real time to the payer's financial institution. All message structures follow the **Payments Canada ISO 20022** specification.

This API is one component of the broader RTR Release 2 capability. You are responsible for **this endpoint only**. Downstream components (routing, notification service, state machine persistence) are described in this pack so you understand the contracts your code must fulfil. Stub or mock them as needed during development.

Client will be demoed on swagger.

---

## Files in This Pack — Read in Order

| # | File | Purpose |
|---|------|---------|
| 1 | `01-context.md` | Background: RTR, RtP, ISO 20022 messages, system actors, and where this API fits |
| 2 | `02-requirements.md` | Functional requirements this API must satisfy (source of truth for scope) |
| 3 | `03-api-spec.md` | Full API contract: endpoint, request/response fields, HTTP codes, idempotency rules |
| 4 | `04-data-model.md` | Data entities this API reads and writes |
| 5 | `05-stories.md` | User stories with acceptance criteria and dev tasks (Wave 1 MVP and Wave 2) |
| 6 | `06-qa-test-cases.md` | QA test cases for all stories — positive, negative, and edge cases |

---

## Your Goal

By the end of your implementation:

1. `POST /rtp/v1/requests` is live, validated, and returns a unique RtP Transaction ID on success
2. All mandatory field validations return the correct ISO 20022 reason codes on failure
3. Duplicate requests within 90 days return the original transaction ID (idempotent)
4. The request is routed to the payer's participant via account-based routing (or a stub that records the routing intent)
5. All 7 Wave 1 stories in `05-stories.md` have their acceptance criteria met
6. All positive and negative QA test cases in `06-qa-test-cases.md` pass

---

## Scope Boundaries

**In scope for this task:**
- `POST /rtp/v1/requests` endpoint
- pain.013 inbound parsing and validation
- RtP Transaction ID generation
- Duplicate detection (90-day composite key)
- Account-based routing resolution (stub acceptable)
- Synchronous pain.002 ACK response
- Persistence of `RtPTransaction` and `RtPStateTransition` records
- Initial state machine transition: `null → Submitted → Delivered`

**Out of scope (downstream — stub or mock):**
- Payer Response API (`POST /rtp/v1/requests/{id}/responses`)
- Deferred payment scheduler
- Expiry monitor
- Full Notification Service (emit the event; delivery is downstream)
- SCT linkage validation

---

## Key Constraints

- **No proprietary message extensions.** All messages must conform to Payments Canada ISO 20022 XSD schemas exactly.
- **Fixed amount only.** The API must not accept or return partial amounts.
- **Idempotency is mandatory.** Duplicate submissions must never create a second RtP record.
- **Reason codes are standardised.** All error responses must use ISO 20022 ExternalReasonCode values — no free-text-only errors on the external API surface.
- **mTLS authentication.** All participant connections use mutual TLS with RTR Exchange PKI credentials.
- **Canadian data residency.** All persisted data must remain within Canada.

---

## Placeholders (Scheme Rules Not Yet Published)

Three values depend on Payments Canada RTR Release 2 rules not yet published. Use configurable parameters for these:

| Parameter | Description | Suggested Default for Dev |
|-----------|-------------|--------------------------|
| `RTP_DEFAULT_EXPIRY_HOURS` | Default validity window when originator omits ExpiryDateTime | `72` hours |
| `RTP_DUPLICATE_WINDOW_DAYS` | Lookback window for duplicate detection | `90` days |
| `RTP_DELIVERY_RETRY_MAX` | Maximum delivery retry attempts | `3` |

---

## Dependency Contracts (Stub These)

### 1. Routing Directory
Your code calls an account-to-participant resolver. Interface:
```
resolveParticipant(debtorAccountNumber: string) → { participantId: string, endpointUrl: string } | null
```
Return `null` if the account is not routable → reject with `AC01`.

### 2. State Machine / Event Bus
On creation, emit:
```
RtPEvent { type: "SUBMITTED", rtpTransactionId, timestamp, participantId }
RtPEvent { type: "DELIVERED", rtpTransactionId, timestamp, participantId }
```
Downstream services (Notification Service, Expiry Monitor) consume these events. Stub the emitter to log events during development.

### 3. XSD Validator
Validate inbound pain.013 XML against the Payments Canada XSD schema. Use a schema validation library appropriate to your stack. Schema file reference: `pain.013.001.07` (Payments Canada variant).
