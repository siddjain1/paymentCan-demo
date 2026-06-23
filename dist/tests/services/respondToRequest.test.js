"use strict";
// src/tests/services/respondToRequest.test.ts
// Unit tests for respondToRequest() service — ticket 4.2 ACs.
Object.defineProperty(exports, "__esModule", { value: true });
const r2pRequest_1 = require("../../services/r2pRequest");
const store_1 = require("../../db/store");
// ── Fixtures ──────────────────────────────────────────────────
const baseInput = {
    payerId: 'payer@banka.ca',
    payeeId: 'payee@bankb.ca',
    amount: 200.0,
    currency: 'CAD',
    dueDate: '2026-09-01',
    expiryTimestamp: '2099-09-01T23:59:59Z',
    remittanceInfo: 'Invoice #55',
    idempotencyKey: 'idem-respond-001',
};
const ackInput = { participantId: 'BANK_A', receivedAt: '2026-07-01T10:00:00Z' };
function seedDelivered() {
    const result = (0, r2pRequest_1.createRequest)(baseInput);
    if (!result.ok)
        throw new Error('Seed failed: ' + result.message);
    const id = result.r2pId;
    forceStatus(id, 'sent');
    (0, r2pRequest_1.acknowledgeRequest)(id, ackInput);
    return id;
}
function forceStatus(id, status) {
    const row = r2pRequest_1.r2pRepo.findById(id);
    if (!row)
        throw new Error(`Row not found: ${id}`);
    r2pRequest_1.r2pRepo.update(id, { updated_at: new Date().toISOString(), status }, row.version);
}
function forceExpiry(id) {
    const row = r2pRequest_1.r2pRepo.findById(id);
    if (!row)
        throw new Error(`Row not found: ${id}`);
    r2pRequest_1.r2pRepo.update(id, { updated_at: new Date().toISOString(), expiry_timestamp: '2000-01-01T00:00:00Z' }, row.version);
}
beforeEach(() => {
    (0, r2pRequest_1.resetStore)();
    (0, store_1.resetStore)();
});
// ── AC: Accept response triggers Payment Execution Engine ─────
describe('respondToRequest — accept', () => {
    it('returns ok:true with status=accepted', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.r2pId).toBe(id);
        expect(result.status).toBe('accepted');
    });
    it('transitions store status to accepted', () => {
        const id = seedDelivered();
        (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        expect(r2pRequest_1.r2pRepo.findById(id)?.status).toBe('accepted');
    });
    it('emits PAYMENT_TRIGGERED audit entry on accept', () => {
        const id = seedDelivered();
        (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        const triggered = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'PAYMENT_TRIGGERED');
        expect(triggered).toHaveLength(1);
        expect(triggered[0].r2p_id).toBe(id);
        expect(triggered[0].actor).toBe('payment-engine');
    });
});
// ── AC: Decline/defer transitions state and notifies ─────────
describe('respondToRequest — decline', () => {
    it('returns ok:true with status=declined', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'decline', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.status).toBe('declined');
    });
    it('transitions store status to declined', () => {
        const id = seedDelivered();
        (0, r2pRequest_1.respondToRequest)(id, { responseType: 'decline', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        expect(r2pRequest_1.r2pRepo.findById(id)?.status).toBe('declined');
    });
    it('does NOT emit PAYMENT_TRIGGERED on decline', () => {
        const id = seedDelivered();
        (0, r2pRequest_1.respondToRequest)(id, { responseType: 'decline', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        const triggered = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'PAYMENT_TRIGGERED');
        expect(triggered).toHaveLength(0);
    });
});
describe('respondToRequest — defer', () => {
    it('returns ok:true with status=deferred', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'defer', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.status).toBe('deferred');
    });
    it('transitions store status to deferred', () => {
        const id = seedDelivered();
        (0, r2pRequest_1.respondToRequest)(id, { responseType: 'defer', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        expect(r2pRequest_1.r2pRepo.findById(id)?.status).toBe('deferred');
    });
});
// ── AC: Response persisted to R2PResponse table ───────────────
describe('respondToRequest — persistence', () => {
    it('persists response row with correct fields', () => {
        const id = seedDelivered();
        (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        const row = r2pRequest_1.responseRepo.findByR2PId(id);
        expect(row).toBeDefined();
        expect(row?.r2p_id).toBe(id);
        expect(row?.response_type).toBe('accept');
        expect(row?.responding_participant_id).toBe('BANK_A');
        expect(row?.responded_at).toBe('2026-07-01T11:00:00Z');
        expect(typeof row?.response_id).toBe('string');
        expect(typeof row?.created_at).toBe('string');
    });
    it('increments version on the request row', () => {
        const id = seedDelivered();
        const before = r2pRequest_1.r2pRepo.findById(id);
        (0, r2pRequest_1.respondToRequest)(id, { responseType: 'decline', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        const after = r2pRequest_1.r2pRepo.findById(id);
        expect(after?.version).toBe((before?.version ?? 0) + 1);
    });
});
// ── AC: Originating participant notified via Event Publisher ──
describe('respondToRequest — event emission', () => {
    it('emits EVENT_RESPONDED_EMITTED for accept', () => {
        const id = seedDelivered();
        (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        const emitted = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'EVENT_RESPONDED_EMITTED');
        expect(emitted).toHaveLength(1);
        expect(emitted[0].actor).toBe('event-publisher');
    });
    it('emits EVENT_RESPONDED_EMITTED for decline', () => {
        const id = seedDelivered();
        (0, r2pRequest_1.respondToRequest)(id, { responseType: 'decline', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        const emitted = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'EVENT_RESPONDED_EMITTED');
        expect(emitted).toHaveLength(1);
    });
    it('emits EVENT_RESPONDED_EMITTED for defer', () => {
        const id = seedDelivered();
        (0, r2pRequest_1.respondToRequest)(id, { responseType: 'defer', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        const emitted = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'EVENT_RESPONDED_EMITTED');
        expect(emitted).toHaveLength(1);
    });
    it('does not emit event on failure', () => {
        (0, r2pRequest_1.respondToRequest)('nonexistent', { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        const emitted = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'EVENT_RESPONDED_EMITTED');
        expect(emitted).toHaveLength(0);
    });
});
// ── State transition recorded ─────────────────────────────────
describe('respondToRequest — state transition', () => {
    it('appends transition delivered → accepted', () => {
        const id = seedDelivered();
        (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        const t = r2pRequest_1.transitionRepo.list().filter((t) => t.r2p_id === id && t.to_status === 'accepted');
        expect(t).toHaveLength(1);
        expect(t[0].from_status).toBe('delivered');
        expect(t[0].actor).toBe('BANK_A');
    });
    it('appends transition delivered → declined', () => {
        const id = seedDelivered();
        (0, r2pRequest_1.respondToRequest)(id, { responseType: 'decline', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        const t = r2pRequest_1.transitionRepo.list().filter((t) => t.r2p_id === id && t.to_status === 'declined');
        expect(t).toHaveLength(1);
        expect(t[0].from_status).toBe('delivered');
    });
});
// ── Error cases ───────────────────────────────────────────────
describe('respondToRequest — NOT_FOUND', () => {
    it('returns NOT_FOUND for unknown r2pId', () => {
        const result = (0, r2pRequest_1.respondToRequest)('00000000-0000-7000-0000-000000000000', { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('NOT_FOUND');
    });
});
describe('respondToRequest — INVALID_STATE_TRANSITION', () => {
    const nonDeliveredStates = ['created', 'sent', 'accepted', 'declined', 'deferred', 'expired', 'cancelled', 'payment_processing', 'paid'];
    nonDeliveredStates.forEach((state) => {
        it(`returns INVALID_STATE_TRANSITION when status is ${state}`, () => {
            const id = seedDelivered();
            forceStatus(id, state);
            const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
            expect(result.ok).toBe(false);
            if (result.ok)
                return;
            expect(result.code).toBe('INVALID_STATE_TRANSITION');
        });
    });
});
describe('respondToRequest — EXPIRED', () => {
    it('returns EXPIRED when expiryTimestamp is in the past', () => {
        const id = seedDelivered();
        forceExpiry(id);
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('EXPIRED');
    });
});
describe('respondToRequest — VALIDATION_ERROR', () => {
    it('returns VALIDATION_ERROR for invalid responseType', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'approve', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('VALIDATION_ERROR');
    });
});
//# sourceMappingURL=respondToRequest.test.js.map