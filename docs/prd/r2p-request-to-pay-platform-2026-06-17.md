# PRD: Request-to-Pay (R2P) Platform

## Problem Statement

Payments Canada needs a standardized Request-to-Pay (R2P) platform that allows payees to digitally request payment from payers through their respective financial institution participants. Today, payment initiation is unilateral — the payer must act without a structured request. R2P closes this gap by enabling a formal, trackable, ISO 20022-compliant request lifecycle from creation through settlement, with real-time routing, status tracking, and exception handling across all Payments Canada participants.

---

## Target Personas

**Payee (Requestor)**
A business or individual who is owed money. Initiates the R2P request specifying amount, due date, payer identity, and remittance details. Wants confirmation that the request was delivered and acted upon.

**Payer (Receiver)**
A business or individual who receives the payment request via their financial institution. Reviews the request and responds: accept, decline, defer, or partial payment. Wants clarity on what they owe and the ability to act on their terms.

**Participant (Financial Institution)**
A bank or credit union connected to the Payments Canada network. Originates or receives R2P messages on behalf of their customers. Needs reliable routing, acknowledgement, and real-time status updates.

**Payments Canada (Operator)**
The infrastructure operator. Responsible for routing correctness, ISO 20022 compliance, settlement finality, and audit integrity across all participants.

---

## User Stories

**Request Initiation**
- As a payee, I want to submit a payment request with mandatory fields (payer ID, payee ID, amount, currency, due date, expiry, remittance info) so that the payer receives a structured, actionable request.
- As the platform, I want to validate all fields and generate a globally unique transaction ID so that each request is traceable and duplicate-free.
- As a payee, I want to modify or cancel my request before the payer accepts it so that I can correct errors without creating a new request.

**Routing & Delivery**
- As a participant, I want R2P messages routed in real time to the correct receiving participant so that there are no delays in delivery.
- As the platform, I want to resolve payer addresses using proxy or account mapping so that payees don't need to know raw account numbers.
- As a participant, I want retry and error handling on failed deliveries so that transient failures do not result in lost requests.

**Receipt & Acknowledgement**
- As a receiving participant, I want to acknowledge receipt of a request so that the originating participant knows delivery succeeded.
- As the platform, I want to capture timestamped acknowledgements so that there is an auditable record for every delivered request.
- As the platform, I want to generate standardized rejection responses for undeliverable requests so that the payee is informed promptly.

**Payer Response**
- As a payer, I want to accept, decline, defer, or make a partial payment on a request so that I can respond on my terms.
- As the platform, I want to validate the response against the original request (amount, expiry) so that invalid or out-of-scope responses are rejected.
- As the payee's participant, I want to be notified of the payer's response in real time so that downstream payment or reconciliation can begin immediately.

**Payment Execution**
- As a payer, I want my acceptance to trigger a real-time payment referencing the R2P transaction ID so that the funds transfer is directly linked to the request.
- As the platform, I want to validate the payment-to-request linkage and process it through real-time clearing and settlement so that funds move with finality.
- As a payee, I want the R2P status updated to "Paid" upon settlement so that I have a definitive confirmation.

**Lifecycle & Status**
- As a participant, I want to query the current status and full state history of any R2P request so that I can service customer inquiries.
- As a participant, I want to subscribe to real-time status events so that my systems react automatically to state changes.

**Expiry & Exceptions**
- As the platform, I want requests to automatically expire at their defined expiry timestamp so that stale requests cannot be acted on.
- As a participant, I want standardized error codes for duplicate requests, invalid states, and failed payments so that my systems can handle exceptions programmatically.

**Cancellation & Modification**
- As a payee, I want to modify permissible fields on a request before acceptance so that I can correct details without restarting the process.
- As a payee, I want to cancel an active request before acceptance so that neither party is blocked on an obsolete request.
- As the platform, I want to notify the receiving participant of any modification or cancellation in real time and maintain a full audit history so that all parties stay in sync and changes are traceable.

---

## Scope — Included

- R2P request creation API with full field validation and idempotency
- Unique transaction ID generation
- Real-time routing between participants with proxy/account address resolution
- Delivery status tracking (pending, delivered, failed) with retry logic
- Acknowledgement API and timestamped audit capture
- Payer response API (accept, decline, defer, partial)
- Response validation against original request
- Real-time payment initiation triggered by acceptance, linked to R2P ID
- Real-time clearing and settlement with finality
- Full lifecycle state model: created → sent → delivered → accepted / declined / deferred → expired → paid
- Status query API and real-time event subscriptions
- Automatic expiry enforcement
- Cancellation and modification APIs with real-time participant notification
- Full audit history of all modifications and cancellations
- ISO 20022 message conformance with schema validation
- Message versioning and backward compatibility

---

## Scope — Excluded

- Payer-facing consumer UI (delivered by participant banks, not Payments Canada)
- Payee-facing business portals
- Partial payment support (flagged as optional — subject to participant capability)
- Cross-border R2P (international ISO 20022 interoperability out of scope for this phase)
- Dispute resolution workflows post-payment
- Fraud scoring or AML screening (handled by participant systems)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Request delivery latency (end-to-end) | < 2 seconds P99 |
| Message schema validation pass rate | 100% |
| Duplicate request rejection rate | 100% |
| Expiry enforcement accuracy | 100% |
| Real-time payment linkage success rate | > 99.9% |
| Participant API uptime | 99.99% |
| Audit trail completeness | 100% of all state transitions captured |
| ISO 20022 conformance | Full conformance, zero schema violations |

---

## Open Questions

1. **Partial payment support** — Which participants support partial payment responses? Is this phase-1 or phase-2?
2. **Proxy resolution** — What directory service is used for proxy-to-account mapping? Is there an existing Payments Canada proxy registry?
3. **Expiry window** — Is there a platform-defined maximum expiry window, or is it fully payee-controlled?
4. **Defer semantics** — Does "defer" extend the due date, create a new request, or simply hold the current one? Who controls the defer period?
5. **Settlement rail** — Does R2P-triggered payment run over Lynx (RTGS), RTR, or both depending on amount?
6. **Versioning strategy** — What is the supported backward compatibility window for ISO 20022 message schema changes?
7. **Event subscription mechanism** — Push (webhooks) or pull (polling API) for real-time status events?
