"use strict";
// src/services/paymentEngine.ts
// Payment Execution Engine — submits R2P-linked payments to the settlement rail.
// Settlement rail is stubbed for POC: auto-resolves success after 500ms.
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRepo = void 0;
exports.resetPaymentStore = resetPaymentStore;
exports.setSettlementRail = setSettlementRail;
exports.resetSettlementRail = resetSettlementRail;
exports.submitPayment = submitPayment;
exports.handleSettlementCallback = handleSettlementCallback;
const crypto_1 = require("crypto");
const r2pRequest_1 = require("./r2pRequest");
// ── In-memory store ───────────────────────────────────────────
const paymentsById = new Map();
const paymentsByR2PId = new Map();
exports.paymentRepo = {
    save(row) {
        paymentsById.set(row.payment_id, row);
        paymentsByR2PId.set(row.r2p_id, row);
    },
    findById(id) {
        return paymentsById.get(id);
    },
    findByR2PId(r2pId) {
        return paymentsByR2PId.get(r2pId);
    },
    update(paymentId, fields) {
        const current = paymentsById.get(paymentId);
        if (!current)
            return;
        const updated = { ...current, ...fields };
        paymentsById.set(paymentId, updated);
        paymentsByR2PId.set(updated.r2p_id, updated);
    },
    list() {
        return Array.from(paymentsById.values());
    },
};
/** Reset store. Only for use in tests. */
function resetPaymentStore() {
    paymentsById.clear();
    paymentsByR2PId.clear();
}
// ── Injectable settlement rail ────────────────────────────────
const defaultRail = (paymentId) => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500));
let settlementRail = defaultRail;
function setSettlementRail(fn) { settlementRail = fn; }
function resetSettlementRail() { settlementRail = defaultRail; }
// ── submitPayment ─────────────────────────────────────────────
async function submitPayment(input) {
    // 1. Fetch r2p request
    const r2p = r2pRequest_1.r2pRepo.findById(input.r2pId);
    if (!r2p) {
        return { ok: false, code: 'R2P_NOT_FOUND', message: `R2P request not found: ${input.r2pId}` };
    }
    // 2. State guard
    if (r2p.status !== 'accepted') {
        return { ok: false, code: 'INVALID_STATE_TRANSITION', message: `Cannot submit payment for request in state: ${r2p.status}` };
    }
    // 3. Amount guard
    if (input.paymentAmount !== r2p.amount) {
        return { ok: false, code: 'AMOUNT_MISMATCH', message: `paymentAmount ${input.paymentAmount} does not match request amount ${r2p.amount}` };
    }
    const now = new Date().toISOString();
    const paymentId = (0, crypto_1.randomUUID)();
    // 4. Persist payment row
    exports.paymentRepo.save({
        payment_id: paymentId,
        r2p_id: input.r2pId,
        amount: input.paymentAmount,
        currency: input.currency,
        payer_id: input.payerId,
        payee_id: input.payeeId,
        status: 'processing',
        submitted_at: now,
    });
    // 5. Transition accepted → payment_processing
    r2pRequest_1.r2pRepo.update(input.r2pId, { status: 'payment_processing', updated_at: now }, r2p.version);
    r2pRequest_1.transitionRepo.append({
        r2p_id: input.r2pId,
        from_status: 'accepted',
        to_status: 'payment_processing',
        actor: 'payment-engine',
    });
    // 6. Audit
    r2pRequest_1.auditRepo.append({
        r2p_id: input.r2pId,
        event_type: 'PAYMENT_SUBMITTED',
        actor: 'payment-engine',
        detail: JSON.stringify({ paymentId, amount: input.paymentAmount, currency: input.currency }),
    });
    // 7. Fire stub settlement rail (fire-and-forget)
    void settlementRail(paymentId).then(({ success }) => {
        void handleSettlementCallback(paymentId, success);
    });
    return { ok: true, paymentId, r2pId: input.r2pId, status: 'processing' };
}
// ── handleSettlementCallback ──────────────────────────────────
async function handleSettlementCallback(paymentId, success) {
    // 1. Lookup — no-op if missing (idempotent)
    const payment = exports.paymentRepo.findById(paymentId);
    if (!payment)
        return;
    const r2p = r2pRequest_1.r2pRepo.findById(payment.r2p_id);
    if (!r2p)
        return;
    // 2. Idempotency guard — only act on payment_processing state
    if (r2p.status !== 'payment_processing')
        return;
    const now = new Date().toISOString();
    if (success) {
        // 3a. Success path
        exports.paymentRepo.update(paymentId, { status: 'settled', settled_at: now });
        r2pRequest_1.r2pRepo.update(payment.r2p_id, { status: 'paid', updated_at: now }, r2p.version);
        r2pRequest_1.transitionRepo.append({
            r2p_id: payment.r2p_id,
            from_status: 'payment_processing',
            to_status: 'paid',
            actor: 'payment-engine',
        });
        r2pRequest_1.auditRepo.append({
            r2p_id: payment.r2p_id,
            event_type: 'SETTLEMENT_CONFIRMED',
            actor: 'payment-engine',
            detail: JSON.stringify({ paymentId }),
        });
        r2pRequest_1.auditRepo.append({
            r2p_id: payment.r2p_id,
            event_type: 'EVENT_PAID_EMITTED',
            actor: 'event-publisher',
            detail: JSON.stringify({ paymentId, notified: ['originator', 'receiver'] }),
        });
    }
    else {
        // 3b. Failure path
        exports.paymentRepo.update(paymentId, { status: 'failed' });
        r2pRequest_1.r2pRepo.update(payment.r2p_id, { status: 'payment_failed', updated_at: now }, r2p.version);
        r2pRequest_1.transitionRepo.append({
            r2p_id: payment.r2p_id,
            from_status: 'payment_processing',
            to_status: 'payment_failed',
            actor: 'payment-engine',
        });
        r2pRequest_1.auditRepo.append({
            r2p_id: payment.r2p_id,
            event_type: 'SETTLEMENT_FAILED',
            actor: 'payment-engine',
            detail: JSON.stringify({ paymentId }),
        });
        r2pRequest_1.auditRepo.append({
            r2p_id: payment.r2p_id,
            event_type: 'EVENT_PAYMENT_FAILED_EMITTED',
            actor: 'event-publisher',
            detail: JSON.stringify({ paymentId, notified: ['originator', 'receiver'] }),
        });
    }
}
//# sourceMappingURL=paymentEngine.js.map