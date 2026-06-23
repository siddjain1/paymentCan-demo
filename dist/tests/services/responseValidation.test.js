"use strict";
// src/tests/services/responseValidation.test.ts
// Unit tests for ticket 4.3 — response validation (amount guard).
// Guards 1 (INVALID_STATE_TRANSITION) and 2 (EXPIRED) are covered in
// respondToRequest.test.ts; this file covers the new amount validation only.
Object.defineProperty(exports, "__esModule", { value: true });
const r2pRequest_1 = require("../../services/r2pRequest");
const store_1 = require("../../db/store");
// ── Fixtures ──────────────────────────────────────────────────
const REQUEST_AMOUNT = 200.0;
const baseInput = {
    payerId: 'payer@banka.ca',
    payeeId: 'payee@bankb.ca',
    amount: REQUEST_AMOUNT,
    currency: 'CAD',
    dueDate: '2026-10-01',
    expiryTimestamp: '2099-10-01T23:59:59Z',
    remittanceInfo: 'Invoice #77',
    idempotencyKey: 'idem-val-001',
};
const ackInput = { participantId: 'BANK_A', receivedAt: '2026-07-01T10:00:00Z' };
function seedDelivered() {
    const result = (0, r2pRequest_1.createRequest)(baseInput);
    if (!result.ok)
        throw new Error('Seed failed: ' + result.message);
    const id = result.r2pId;
    const row = r2pRequest_1.r2pRepo.findById(id);
    r2pRequest_1.r2pRepo.update(id, { updated_at: new Date().toISOString(), status: 'sent' }, row.version);
    (0, r2pRequest_1.acknowledgeRequest)(id, ackInput);
    return id;
}
beforeEach(() => {
    (0, r2pRequest_1.resetStore)();
    (0, store_1.resetStore)();
});
// ── AC: amount absent — passes through unchanged ──────────────
describe('responseValidation — amount absent', () => {
    it('succeeds when amount is not provided', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z' });
        expect(result.ok).toBe(true);
    });
});
// ── AC: amount matching request.amount — passes ───────────────
describe('responseValidation — amount matches', () => {
    it('succeeds when amount exactly matches request amount', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z', amount: REQUEST_AMOUNT });
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.status).toBe('accepted');
    });
    it('amount match works for decline too', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'decline', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z', amount: REQUEST_AMOUNT });
        expect(result.ok).toBe(true);
    });
    it('amount match works for defer too', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'defer', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z', amount: REQUEST_AMOUNT });
        expect(result.ok).toBe(true);
    });
});
// ── AC: amount present but ≠ request.amount → 400 AMOUNT_MISMATCH
describe('responseValidation — AMOUNT_MISMATCH', () => {
    it('returns AMOUNT_MISMATCH when amount is higher than request amount', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z', amount: REQUEST_AMOUNT + 1 });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('AMOUNT_MISMATCH');
    });
    it('returns AMOUNT_MISMATCH when amount is lower than request amount', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z', amount: REQUEST_AMOUNT - 1 });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('AMOUNT_MISMATCH');
    });
    it('returns AMOUNT_MISMATCH for decline with wrong amount', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'decline', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z', amount: 999 });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('AMOUNT_MISMATCH');
    });
});
// ── AC: amount present but invalid → 400 VALIDATION_ERROR ────
describe('responseValidation — VALIDATION_ERROR on bad amount', () => {
    it('returns VALIDATION_ERROR for amount = 0', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z', amount: 0 });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('VALIDATION_ERROR');
    });
    it('returns VALIDATION_ERROR for negative amount', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z', amount: -50 });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('VALIDATION_ERROR');
    });
    it('returns VALIDATION_ERROR for Infinity', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z', amount: Infinity });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('VALIDATION_ERROR');
    });
    it('returns VALIDATION_ERROR for NaN', () => {
        const id = seedDelivered();
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z', amount: NaN });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('VALIDATION_ERROR');
    });
});
// ── Guard ordering: state/expiry checked before amount ────────
describe('responseValidation — guard ordering', () => {
    it('returns INVALID_STATE_TRANSITION before checking amount', () => {
        const id = seedDelivered();
        const row = r2pRequest_1.r2pRepo.findById(id);
        r2pRequest_1.r2pRepo.update(id, { updated_at: new Date().toISOString(), status: 'accepted' }, row.version);
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z', amount: 999 });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('INVALID_STATE_TRANSITION');
    });
    it('returns EXPIRED before checking amount', () => {
        const id = seedDelivered();
        const row = r2pRequest_1.r2pRepo.findById(id);
        r2pRequest_1.r2pRepo.update(id, { updated_at: new Date().toISOString(), expiry_timestamp: '2000-01-01T00:00:00Z' }, row.version);
        const result = (0, r2pRequest_1.respondToRequest)(id, { responseType: 'accept', participantId: 'BANK_A', respondedAt: '2026-07-01T11:00:00Z', amount: 999 });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('EXPIRED');
    });
});
//# sourceMappingURL=responseValidation.test.js.map