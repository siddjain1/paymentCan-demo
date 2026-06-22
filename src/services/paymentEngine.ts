// src/services/paymentEngine.ts
// Payment Execution Engine — submits R2P-linked payments to the settlement rail.
// Settlement rail is stubbed for POC: auto-resolves success after 500ms.

import { randomUUID } from 'crypto'
import { r2pRepo, auditRepo, transitionRepo } from './r2pRequest'

// ── Types ─────────────────────────────────────────────────────

export interface SubmitPaymentInput {
  r2pId:         string
  paymentAmount: number
  currency:      string
  payerId:       string
  payeeId:       string
}

export type SubmitPaymentResult =
  | { ok: true;  paymentId: string; r2pId: string; status: 'processing' }
  | { ok: false; code: 'R2P_NOT_FOUND' | 'INVALID_STATE_TRANSITION' | 'AMOUNT_MISMATCH'; message: string }

export interface R2PPaymentRow {
  payment_id:   string
  r2p_id:       string
  amount:       number
  currency:     string
  payer_id:     string
  payee_id:     string
  status:       'processing' | 'settled' | 'failed'
  submitted_at: string
  settled_at?:  string
}

export type SettlementRailFn = (paymentId: string) => Promise<{ success: boolean }>

// ── In-memory store ───────────────────────────────────────────

const paymentsById:    Map<string, R2PPaymentRow> = new Map()
const paymentsByR2PId: Map<string, R2PPaymentRow> = new Map()

export const paymentRepo = {
  save(row: R2PPaymentRow): void {
    paymentsById.set(row.payment_id, row)
    paymentsByR2PId.set(row.r2p_id, row)
  },
  findById(id: string): R2PPaymentRow | undefined {
    return paymentsById.get(id)
  },
  findByR2PId(r2pId: string): R2PPaymentRow | undefined {
    return paymentsByR2PId.get(r2pId)
  },
  update(paymentId: string, fields: Partial<R2PPaymentRow>): void {
    const current = paymentsById.get(paymentId)
    if (!current) return
    const updated = { ...current, ...fields }
    paymentsById.set(paymentId, updated)
    paymentsByR2PId.set(updated.r2p_id, updated)
  },
  list(): R2PPaymentRow[] {
    return Array.from(paymentsById.values())
  },
}

/** Reset store. Only for use in tests. */
export function resetPaymentStore(): void {
  paymentsById.clear()
  paymentsByR2PId.clear()
}

// ── Injectable settlement rail ────────────────────────────────

const defaultRail: SettlementRailFn = (paymentId) =>
  new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500))

let settlementRail: SettlementRailFn = defaultRail

export function setSettlementRail(fn: SettlementRailFn): void { settlementRail = fn }
export function resetSettlementRail(): void { settlementRail = defaultRail }

// ── submitPayment ─────────────────────────────────────────────

export async function submitPayment(input: SubmitPaymentInput): Promise<SubmitPaymentResult> {
  // 1. Fetch r2p request
  const r2p = r2pRepo.findById(input.r2pId)
  if (!r2p) {
    return { ok: false, code: 'R2P_NOT_FOUND', message: `R2P request not found: ${input.r2pId}` }
  }

  // 2. State guard
  if (r2p.status !== 'accepted') {
    return { ok: false, code: 'INVALID_STATE_TRANSITION', message: `Cannot submit payment for request in state: ${r2p.status}` }
  }

  // 3. Amount guard
  if (input.paymentAmount !== r2p.amount) {
    return { ok: false, code: 'AMOUNT_MISMATCH', message: `paymentAmount ${input.paymentAmount} does not match request amount ${r2p.amount}` }
  }

  const now = new Date().toISOString()
  const paymentId = randomUUID()

  // 4. Persist payment row
  paymentRepo.save({
    payment_id:   paymentId,
    r2p_id:       input.r2pId,
    amount:       input.paymentAmount,
    currency:     input.currency,
    payer_id:     input.payerId,
    payee_id:     input.payeeId,
    status:       'processing',
    submitted_at: now,
  })

  // 5. Transition accepted → payment_processing
  r2pRepo.update(input.r2pId, { status: 'payment_processing', updated_at: now }, r2p.version)

  transitionRepo.append({
    r2p_id:      input.r2pId,
    from_status: 'accepted',
    to_status:   'payment_processing',
    actor:       'payment-engine',
  })

  // 6. Audit
  auditRepo.append({
    r2p_id:     input.r2pId,
    event_type: 'PAYMENT_SUBMITTED',
    actor:      'payment-engine',
    detail:     JSON.stringify({ paymentId, amount: input.paymentAmount, currency: input.currency }),
  })

  // 7. Fire stub settlement rail (fire-and-forget — 5.2 wires full callback)
  void settlementRail(paymentId).then(({ success }) => {
    auditRepo.append({
      r2p_id:     input.r2pId,
      event_type: 'SETTLEMENT_CALLBACK',
      actor:      'payment-engine',
      detail:     JSON.stringify({ paymentId, success }),
    })
  })

  return { ok: true, paymentId, r2pId: input.r2pId, status: 'processing' }
}
