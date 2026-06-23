# Context — RTR, RtP, and the Creation API

## 1. Payments Canada Real-Time Rail (RTR)

The Real-Time Rail (RTR) is Canada's 24/7/365 real-time clearing and settlement system, operated by Payments Canada. It processes Single Credit Transfers (SCT) with:

- Settlement finality in **≤ 10 seconds**
- Funds availability in **≤ 60 seconds**
- Continuous operation — no scheduled downtime windows

The RTR Exchange is the central infrastructure component. It receives messages from participant financial institutions, validates them, routes them, and coordinates settlement with the Bank of Canada's RTGS system.

---

## 2. Request-to-Pay (RtP) — What It Is

Request-to-Pay (RtP) is an **additional messaging layer** built on top of the RTR's existing Single Credit Transfer capability. It does not replace SCT — it precedes it.

RtP allows a **payee or biller** to send a structured payment request to a **payer** before any money moves. The payer then decides to accept, decline, or defer the request. Only an accepted request results in a payment (via the existing SCT flow).

### Why This Matters
Without RtP, the payer initiates every transfer. With RtP, the payee can *pull* a request — think utility bills, B2B invoices, subscription renewals — while the payer retains explicit consent and control.

---

## 3. System Actors

| Actor | Role |
|-------|------|
| **Payee / Biller** | End-user who is owed money. Instructs their FI to send an RtP. |
| **Payee's FI (Originating Participant)** | The financial institution submitting the pain.013 to the RTR Exchange via the Creation API. |
| **RTR Exchange** | Payments Canada's central platform. Validates, routes, persists, and coordinates the full RtP lifecycle. **This is what you are building a component of.** |
| **Payer's FI (Responding Participant)** | The financial institution that receives the routed pain.013 and presents it to the payer. |
| **Payer** | End-user who reviews the request and chooses to Accept, Decline, or Defer. |
| **Bank of Canada** | Operates the RTGS for final settlement when the payer accepts and the SCT executes. |

---

## 4. ISO 20022 Messages Involved

The RtP capability introduces three net-new message types and reuses two existing SCT messages.

| Message | Type | Direction | Purpose |
|---------|------|-----------|---------|
| `pain.013` | CreditorPaymentActivationRequest | Payee's FI → RTR Exchange | Biller submits a payment request |
| `pain.014` | CreditorPaymentActivationRequestStatusReport | RTR Exchange → Participants | Status updates at each lifecycle event |
| `pain.002` | PaymentStatusReport | RTR Exchange → Payee's FI | Synchronous ACK / rejection on submission |
| `pacs.008` | FIToFICustomerCreditTransfer | Payer's FI → RTR Exchange | The actual SCT payment (reused from existing RTR) |
| `pacs.002` | FIToFIPaymentStatusReport | RTR Exchange → Participants | Settlement confirmation (reused from existing RTR) |

### For the Creation API specifically:
- **Inbound:** `pain.013` — submitted by the originating participant
- **Synchronous response:** `pain.002` — ACK (ACCP) or rejection (RJCT) with reason code
- **Async downstream:** `pain.014` — delivery notification pushed to originating participant once the request reaches the payer's FI

---

## 5. End-to-End Flow (High Level)

```
Biller → Payee's FI ──[pain.013]──▶ RTR Exchange
                                         │
                                    Validate + Assign ID
                                    Account-based routing
                                         │
                        ◀──[pain.002 ACK]─┘  (synchronous, same call)
                                         │
                                         ▼
                               Payer's FI ──[pain.013 routed]──▶ Payer
                                         │
                               Payer responds (Accept / Decline / Defer)
                                         │
                                         ▼
                                    [pain.014]──▶ Payee's FI (notification)
                                         │
                               If Accepted: pacs.008 SCT ──▶ Settlement
                                         │
                                    [pacs.002]──▶ Both FIs (confirmation)
```

**The Creation API is responsible for the first three steps only:**
1. Accept the pain.013 from the originating participant
2. Validate, assign ID, route to payer's FI
3. Return synchronous pain.002 ACK

---

## 6. RTR Participant Model

Participants connect to the RTR Exchange in one of four tiers. The Creation API must handle submissions from all tiers without tier-specific behaviour differences.

| Tier | Description |
|------|-------------|
| Direct Settlement Participant | Connects directly; holds a settlement account at the Bank of Canada |
| Settlement Agent | Acts on behalf of indirect participants |
| Indirect Settlement Participant | Connects via a Settlement Agent |
| Connection Service Provider (CSP) | Technical connectivity layer for participants who outsource connection management |

All participants authenticate via **mutual TLS (mTLS)** using certificates issued by the RTR Exchange PKI. The Creation API must validate the participant's mTLS certificate against their entitlement before processing any submission.

---

## 7. State Machine — States Relevant to the Creation API

The Creation API initiates the RtP lifecycle. It is responsible for the first two state transitions:

```
[New] ──[pain.013 accepted]──▶ Submitted ──[routed to payer FI]──▶ Delivered
```

Full lifecycle states (for reference — other APIs own the remaining transitions):

| State | Description | Terminal? |
|-------|-------------|-----------|
| **Submitted** | pain.013 accepted by RTR Exchange; ID assigned | No |
| **Delivered** | Routed and delivered to payer's FI | No |
| Accepted | Payer approved the request | No |
| Declined | Payer declined the request | Yes |
| Deferred | Payer scheduled for a future date | No |
| Paid | SCT settled; pacs.002 confirmed | Yes |
| Cancelled | Originator cancelled before payer acted | Yes |
| Expired | ExpiryDateTime elapsed without a terminal response | Yes |
| Rejected | Schema/routing failure at submission | Yes |

---

## 8. Security Model

All security for the Creation API reuses the existing RTR Exchange security infrastructure:

- **Transport:** TLS 1.3 minimum on all connections
- **Participant identity:** mTLS — participant certificate CN must match the OriginatorParticipantId in the message
- **Authorisation:** Participant entitlement check at API Gateway before any application logic executes
- **Data at rest:** AES-256 encryption for all persisted RtP records
- **Data residency:** All data must remain within Canada (Canadian data centre only)

The Creation API does **not** handle end-user (payer) authentication. That is the payer's FI's responsibility at the Response API layer.
