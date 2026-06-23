"use strict";
// src/tests/services/paymentEngine.test.ts
// Unit tests for submitPayment() service — ticket 5.1 ACs.
Object.defineProperty(exports, "__esModule", { value: true });
const paymentEngine_1 = require("../../services/paymentEngine");
const r2pRequest_1 = require("../../services/r2pRequest");
const store_1 = require("../../db/store");
// ── Fixtures ──────────────────────────────────────────────────
const REQUEST_AMOUNT = 200.0;
const baseInput = {
    payerId: 'payer@banka.ca',
    payeeId: 'payee@bankb.ca',
    amount: REQUEST_AMOUNT,
    currency: 'CAD',
    dueDate: '2026-11-01',
    expiryTimestamp: '2099-11-01T23:59:59Z',
    remittanceInfo: 'Invoice #88',
    idempotencyKey: 'idem-pay-001',
};
const ackInput = { participantId: 'BANK_A', receivedAt: '2026-07-01T10:00:00Z' };
const respondInput = { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' };
const payInput = {
    paymentAmount: REQUEST_AMOUNT,
    currency: 'CAD',
    payerId: 'payer@banka.ca',
    payeeId: 'payee@bankb.ca',
};
function seedAccepted() {
    const result = (0, r2pRequest_1.createRequest)(baseInput);
    if (!result.ok)
        throw new Error('Seed failed: ' + result.message);
    const id = result.r2pId;
    const row = r2pRequest_1.r2pRepo.findById(id);
    r2pRequest_1.r2pRepo.update(id, { updated_at: new Date().toISOString(), status: 'sent' }, row.version);
    (0, r2pRequest_1.acknowledgeRequest)(id, ackInput);
    (0, r2pRequest_1.respondToRequest)(id, respondInput);
    return id;
}
beforeEach(() => {
    (0, r2pRequest_1.resetStore)();
    (0, store_1.resetStore)();
    (0, paymentEngine_1.resetPaymentStore)();
    (0, paymentEngine_1.resetSettlementRail)();
});
// ── AC: Payment message created with R2P transaction ID ───────
describe('submitPayment — happy path', () => {
    it('returns ok:true with paymentId, r2pId, status=processing', async () => {
        const id = seedAccepted();
        const result = await (0, paymentEngine_1.submitPayment)({ r2pId: id, ...payInput });
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.r2pId).toBe(id);
        expect(result.status).toBe('processing');
        expect(typeof result.paymentId).toBe('string');
        expect(result.paymentId.length).toBeGreaterThan(0);
    });
    it('paymentId is different on each call', async () => {
        const id1 = seedAccepted();
        const r1 = await (0, paymentEngine_1.submitPayment)({ r2pId: id1, ...payInput });
        (0, r2pRequest_1.resetStore)();
        (0, store_1.resetStore)();
        (0, paymentEngine_1.resetPaymentStore)();
        baseInput.idempotencyKey = 'idem-pay-002';
        const id2 = seedAccepted();
        baseInput.idempotencyKey = 'idem-pay-001';
        const r2 = await (0, paymentEngine_1.submitPayment)({ r2pId: id2, ...payInput });
        if (!r1.ok || !r2.ok)
            return;
        expect(r1.paymentId).not.toBe(r2.paymentId);
    });
});
// ── AC: Status transitions to payment_processing ──────────────
describe('submitPayment — status transition', () => {
    it('transitions r2p status to payment_processing', async () => {
        const id = seedAccepted();
        await (0, paymentEngine_1.submitPayment)({ r2pId: id, ...payInput });
        expect(r2pRequest_1.r2pRepo.findById(id)?.status).toBe('payment_processing');
    });
    it('appends state transition accepted → payment_processing', async () => {
        const id = seedAccepted();
        await (0, paymentEngine_1.submitPayment)({ r2pId: id, ...payInput });
        const transitions = r2pRequest_1.transitionRepo.list().filter((t) => t.r2p_id === id && t.to_status === 'payment_processing');
        expect(transitions).toHaveLength(1);
        expect(transitions[0].from_status).toBe('accepted');
        expect(transitions[0].actor).toBe('payment-engine');
    });
});
// ── AC: paymentId and r2pId persisted to R2PPayment table ─────
describe('submitPayment — persistence', () => {
    it('persists R2PPayment row with correct fields', async () => {
        const id = seedAccepted();
        const result = await (0, paymentEngine_1.submitPayment)({ r2pId: id, ...payInput });
        if (!result.ok)
            return;
        const row = paymentEngine_1.paymentRepo.findByR2PId(id);
        expect(row).toBeDefined();
        expect(row?.payment_id).toBe(result.paymentId);
        expect(row?.r2p_id).toBe(id);
        expect(row?.amount).toBe(REQUEST_AMOUNT);
        expect(row?.currency).toBe('CAD');
        expect(row?.status).toBe('processing');
        expect(typeof row?.submitted_at).toBe('string');
    });
    it('appends PAYMENT_SUBMITTED audit entry', async () => {
        const id = seedAccepted();
        await (0, paymentEngine_1.submitPayment)({ r2pId: id, ...payInput });
        const entries = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'PAYMENT_SUBMITTED');
        expect(entries).toHaveLength(1);
        expect(entries[0].r2p_id).toBe(id);
        expect(entries[0].actor).toBe('payment-engine');
    });
});
// ── AC: Stubbed settlement rail resolves after 500ms ──────────
describe('submitPayment — settlement stub', () => {
    it('emits SETTLEMENT_CALLBACK audit entry after stub resolves', async () => {
        const id = seedAccepted();
        let resolveFn;
        const stubPromise = new Promise((r) => { resolveFn = r; });
        (0, paymentEngine_1.setSettlementRail)(() => stubPromise);
        await (0, paymentEngine_1.submitPayment)({ r2pId: id, ...payInput });
        // Not yet resolved
        expect(r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'SETTLEMENT_CALLBACK')).toHaveLength(0);
        // Resolve stub and flush microtasks
        resolveFn({ success: true });
        await stubPromise;
        await Promise.resolve();
        const callbacks = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'SETTLEMENT_CALLBACK');
        expect(callbacks).toHaveLength(1);
        expect(callbacks[0].r2p_id).toBe(id);
        expect(JSON.parse(callbacks[0].detail).success).toBe(true);
    });
});
// ── AC: Error guards ──────────────────────────────────────────
describe('submitPayment — R2P_NOT_FOUND', () => {
    it('returns R2P_NOT_FOUND for unknown r2pId', async () => {
        const result = await (0, paymentEngine_1.submitPayment)({ r2pId: '00000000-0000-7000-0000-000000000000', ...payInput });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('R2P_NOT_FOUND');
    });
});
describe('submitPayment — INVALID_STATE_TRANSITION', () => {
    const nonAcceptedStates = ['created', 'sent', 'delivered', 'declined', 'deferred', 'expired', 'cancelled', 'payment_processing', 'paid'];
    nonAcceptedStates.forEach((state) => {
        it(`returns INVALID_STATE_TRANSITION when status is ${state}`, async () => {
            const id = seedAccepted();
            const row = r2pRequest_1.r2pRepo.findById(id);
            r2pRequest_1.r2pRepo.update(id, { updated_at: new Date().toISOString(), status: state }, row.version);
            const result = await (0, paymentEngine_1.submitPayment)({ r2pId: id, ...payInput });
            expect(result.ok).toBe(false);
            if (result.ok)
                return;
            expect(result.code).toBe('INVALID_STATE_TRANSITION');
        });
    });
});
describe('submitPayment — AMOUNT_MISMATCH', () => {
    it('returns AMOUNT_MISMATCH when paymentAmount differs from request amount', async () => {
        const id = seedAccepted();
        const result = await (0, paymentEngine_1.submitPayment)({ r2pId: id, ...payInput, paymentAmount: REQUEST_AMOUNT + 50 });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('AMOUNT_MISMATCH');
    });
    it('returns AMOUNT_MISMATCH when paymentAmount is lower', async () => {
        const id = seedAccepted();
        const result = await (0, paymentEngine_1.submitPayment)({ r2pId: id, ...payInput, paymentAmount: REQUEST_AMOUNT - 1 });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('AMOUNT_MISMATCH');
    });
    it('does not persist payment row on AMOUNT_MISMATCH', async () => {
        const id = seedAccepted();
        await (0, paymentEngine_1.submitPayment)({ r2pId: id, ...payInput, paymentAmount: 999 });
        expect(paymentEngine_1.paymentRepo.findByR2PId(id)).toBeUndefined();
    });
});
//# sourceMappingURL=paymentEngine.test.js.map