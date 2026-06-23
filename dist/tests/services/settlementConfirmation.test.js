"use strict";
// src/tests/services/settlementConfirmation.test.ts
// Unit tests for handleSettlementCallback() — ticket 5.2 ACs.
Object.defineProperty(exports, "__esModule", { value: true });
const paymentEngine_1 = require("../../services/paymentEngine");
const r2pRequest_1 = require("../../services/r2pRequest");
const store_1 = require("../../db/store");
// ── Fixtures ──────────────────────────────────────────────────
const REQUEST_AMOUNT = 300.0;
const baseInput = {
    payerId: 'payer@banka.ca',
    payeeId: 'payee@bankb.ca',
    amount: REQUEST_AMOUNT,
    currency: 'CAD',
    dueDate: '2026-12-01',
    expiryTimestamp: '2099-12-01T23:59:59Z',
    remittanceInfo: 'Invoice #99',
    idempotencyKey: 'idem-settle-001',
};
const ackInput = { participantId: 'BANK_A', receivedAt: '2026-07-01T10:00:00Z' };
const respondInput = { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' };
const payInput = { paymentAmount: REQUEST_AMOUNT, currency: 'CAD', payerId: 'payer@banka.ca', payeeId: 'payee@bankb.ca' };
async function seedProcessing() {
    // Block the rail so submitPayment returns before the callback fires
    (0, paymentEngine_1.setSettlementRail)(() => new Promise(() => { }));
    const cr = (0, r2pRequest_1.createRequest)(baseInput);
    if (!cr.ok)
        throw new Error('createRequest failed');
    const r2pId = cr.r2pId;
    const row = r2pRequest_1.r2pRepo.findById(r2pId);
    r2pRequest_1.r2pRepo.update(r2pId, { updated_at: new Date().toISOString(), status: 'sent' }, row.version);
    (0, r2pRequest_1.acknowledgeRequest)(r2pId, ackInput);
    (0, r2pRequest_1.respondToRequest)(r2pId, respondInput);
    const pr = await (0, paymentEngine_1.submitPayment)({ r2pId, ...payInput });
    if (!pr.ok)
        throw new Error('submitPayment failed');
    return { r2pId, paymentId: pr.paymentId };
}
beforeEach(() => {
    (0, r2pRequest_1.resetStore)();
    (0, store_1.resetStore)();
    (0, paymentEngine_1.resetPaymentStore)();
    (0, paymentEngine_1.resetSettlementRail)();
});
// ── AC: Settlement success → paid ─────────────────────────────
describe('handleSettlementCallback — success', () => {
    it('transitions r2p status to paid', async () => {
        const { r2pId, paymentId } = await seedProcessing();
        await (0, paymentEngine_1.handleSettlementCallback)(paymentId, true);
        expect(r2pRequest_1.r2pRepo.findById(r2pId)?.status).toBe('paid');
    });
    it('updates R2PPayment status to settled', async () => {
        const { paymentId } = await seedProcessing();
        await (0, paymentEngine_1.handleSettlementCallback)(paymentId, true);
        expect(paymentEngine_1.paymentRepo.findById(paymentId)?.status).toBe('settled');
    });
    it('sets settled_at on success', async () => {
        const { paymentId } = await seedProcessing();
        await (0, paymentEngine_1.handleSettlementCallback)(paymentId, true);
        expect(typeof paymentEngine_1.paymentRepo.findById(paymentId)?.settled_at).toBe('string');
    });
    it('appends SETTLEMENT_CONFIRMED audit entry', async () => {
        const { r2pId, paymentId } = await seedProcessing();
        await (0, paymentEngine_1.handleSettlementCallback)(paymentId, true);
        const entries = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'SETTLEMENT_CONFIRMED');
        expect(entries).toHaveLength(1);
        expect(entries[0].r2p_id).toBe(r2pId);
        expect(entries[0].actor).toBe('payment-engine');
    });
    it('appends state transition payment_processing → paid', async () => {
        const { r2pId, paymentId } = await seedProcessing();
        await (0, paymentEngine_1.handleSettlementCallback)(paymentId, true);
        const t = r2pRequest_1.transitionRepo.list().filter((t) => t.r2p_id === r2pId && t.to_status === 'paid');
        expect(t).toHaveLength(1);
        expect(t[0].from_status).toBe('payment_processing');
        expect(t[0].actor).toBe('payment-engine');
    });
});
// ── AC: Settlement failure → payment_failed ───────────────────
describe('handleSettlementCallback — failure', () => {
    it('transitions r2p status to payment_failed', async () => {
        const { r2pId, paymentId } = await seedProcessing();
        await (0, paymentEngine_1.handleSettlementCallback)(paymentId, false);
        expect(r2pRequest_1.r2pRepo.findById(r2pId)?.status).toBe('payment_failed');
    });
    it('updates R2PPayment status to failed', async () => {
        const { paymentId } = await seedProcessing();
        await (0, paymentEngine_1.handleSettlementCallback)(paymentId, false);
        expect(paymentEngine_1.paymentRepo.findById(paymentId)?.status).toBe('failed');
    });
    it('appends SETTLEMENT_FAILED audit entry', async () => {
        const { r2pId, paymentId } = await seedProcessing();
        await (0, paymentEngine_1.handleSettlementCallback)(paymentId, false);
        const entries = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'SETTLEMENT_FAILED');
        expect(entries).toHaveLength(1);
        expect(entries[0].r2p_id).toBe(r2pId);
    });
    it('appends state transition payment_processing → payment_failed', async () => {
        const { r2pId, paymentId } = await seedProcessing();
        await (0, paymentEngine_1.handleSettlementCallback)(paymentId, false);
        const t = r2pRequest_1.transitionRepo.list().filter((t) => t.r2p_id === r2pId && t.to_status === 'payment_failed');
        expect(t).toHaveLength(1);
        expect(t[0].from_status).toBe('payment_processing');
    });
});
// ── AC: Both participants notified ────────────────────────────
describe('handleSettlementCallback — event emission', () => {
    it('emits EVENT_PAID_EMITTED with both participants on success', async () => {
        const { r2pId, paymentId } = await seedProcessing();
        await (0, paymentEngine_1.handleSettlementCallback)(paymentId, true);
        const emitted = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'EVENT_PAID_EMITTED');
        expect(emitted).toHaveLength(1);
        expect(emitted[0].r2p_id).toBe(r2pId);
        expect(emitted[0].actor).toBe('event-publisher');
        const detail = JSON.parse(emitted[0].detail);
        expect(detail.notified).toContain('originator');
        expect(detail.notified).toContain('receiver');
    });
    it('emits EVENT_PAYMENT_FAILED_EMITTED with both participants on failure', async () => {
        const { r2pId, paymentId } = await seedProcessing();
        await (0, paymentEngine_1.handleSettlementCallback)(paymentId, false);
        const emitted = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'EVENT_PAYMENT_FAILED_EMITTED');
        expect(emitted).toHaveLength(1);
        expect(emitted[0].r2p_id).toBe(r2pId);
        expect(emitted[0].actor).toBe('event-publisher');
        const detail = JSON.parse(emitted[0].detail);
        expect(detail.notified).toContain('originator');
        expect(detail.notified).toContain('receiver');
    });
});
// ── AC: Idempotency ───────────────────────────────────────────
describe('handleSettlementCallback — idempotency', () => {
    it('is a no-op for unknown paymentId', async () => {
        await (0, paymentEngine_1.handleSettlementCallback)('nonexistent-id', true);
        expect(r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'SETTLEMENT_CONFIRMED')).toHaveLength(0);
    });
    it('is a no-op if r2p status is already paid (duplicate callback)', async () => {
        const { r2pId, paymentId } = await seedProcessing();
        await (0, paymentEngine_1.handleSettlementCallback)(paymentId, true);
        expect(r2pRequest_1.r2pRepo.findById(r2pId)?.status).toBe('paid');
        // Second call — should be no-op
        await (0, paymentEngine_1.handleSettlementCallback)(paymentId, false);
        expect(r2pRequest_1.r2pRepo.findById(r2pId)?.status).toBe('paid');
        expect(r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'SETTLEMENT_FAILED')).toHaveLength(0);
    });
});
// ── AC: End-to-end via stub rail ──────────────────────────────
describe('handleSettlementCallback — wired via submitPayment stub', () => {
    it('auto-transitions to paid when default 500ms stub fires', async () => {
        (0, paymentEngine_1.resetSettlementRail)();
        const cr = (0, r2pRequest_1.createRequest)({ ...baseInput, idempotencyKey: 'idem-settle-e2e' });
        if (!cr.ok)
            throw new Error();
        const r2pId = cr.r2pId;
        const row = r2pRequest_1.r2pRepo.findById(r2pId);
        r2pRequest_1.r2pRepo.update(r2pId, { updated_at: new Date().toISOString(), status: 'sent' }, row.version);
        (0, r2pRequest_1.acknowledgeRequest)(r2pId, ackInput);
        (0, r2pRequest_1.respondToRequest)(r2pId, respondInput);
        // Use fast stub instead of real 500ms timer
        let resolveFn;
        const stubPromise = new Promise((r) => { resolveFn = r; });
        (0, paymentEngine_1.setSettlementRail)(() => stubPromise);
        await (0, paymentEngine_1.submitPayment)({ r2pId, ...payInput });
        expect(r2pRequest_1.r2pRepo.findById(r2pId)?.status).toBe('payment_processing');
        resolveFn({ success: true });
        await stubPromise;
        await Promise.resolve();
        await Promise.resolve(); // flush handleSettlementCallback microtasks
        expect(r2pRequest_1.r2pRepo.findById(r2pId)?.status).toBe('paid');
    });
});
//# sourceMappingURL=settlementConfirmation.test.js.map