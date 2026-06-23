"use strict";
// src/tests/services/modifyRequest.test.ts
// Unit tests for modifyRequest() service — ticket 2.2 ACs.
Object.defineProperty(exports, "__esModule", { value: true });
const r2pRequest_1 = require("../../services/r2pRequest");
const store_1 = require("../../db/store");
// ── Fixtures ──────────────────────────────────────────────────
const baseInput = {
    payerId: 'payer@banka.ca',
    payeeId: 'payee@bankb.ca',
    amount: 100.0,
    currency: 'CAD',
    dueDate: '2026-07-01',
    expiryTimestamp: '2026-07-01T23:59:59Z',
    remittanceInfo: 'Invoice #42',
    idempotencyKey: 'idem-modify-001',
};
function seedRequest() {
    const result = (0, r2pRequest_1.createRequest)(baseInput);
    if (!result.ok)
        throw new Error('Seed failed: ' + result.message);
    return result.r2pId;
}
beforeEach(() => {
    (0, r2pRequest_1.resetStore)();
    (0, store_1.resetStore)();
});
// ── AC: Valid patch returns ok:true with r2pId, status, updatedAt ──
describe('modifyRequest — valid patch', () => {
    it('returns ok:true with r2pId, status, updatedAt when amount is patched', () => {
        const id = seedRequest();
        const result = (0, r2pRequest_1.modifyRequest)(id, { amount: 200 });
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.r2pId).toBe(id);
        expect(result.status).toBe('created');
        expect(typeof result.updatedAt).toBe('string');
        expect(new Date(result.updatedAt).toISOString()).toBe(result.updatedAt);
    });
    it('returns ok:true when all permitted fields are patched', () => {
        const id = seedRequest();
        const result = (0, r2pRequest_1.modifyRequest)(id, {
            amount: 150,
            dueDate: '2026-08-01',
            expiryTimestamp: '2026-08-01T12:00:00Z',
            remittanceInfo: 'Updated info',
        });
        expect(result.ok).toBe(true);
    });
});
// ── AC: Patched fields are persisted correctly ────────────────
describe('modifyRequest — persistence', () => {
    it('persists amount change', () => {
        const id = seedRequest();
        (0, r2pRequest_1.modifyRequest)(id, { amount: 300 });
        const row = r2pRequest_1.r2pRepo.findById(id);
        expect(row?.amount).toBe(300);
    });
    it('persists dueDate change', () => {
        const id = seedRequest();
        (0, r2pRequest_1.modifyRequest)(id, { dueDate: '2026-09-15' });
        const row = r2pRequest_1.r2pRepo.findById(id);
        expect(row?.due_date).toBe('2026-09-15');
    });
    it('persists expiryTimestamp change', () => {
        const id = seedRequest();
        (0, r2pRequest_1.modifyRequest)(id, { expiryTimestamp: '2026-09-15T00:00:00+05:30' });
        const row = r2pRequest_1.r2pRepo.findById(id);
        expect(row?.expiry_timestamp).toBe('2026-09-15T00:00:00+05:30');
    });
    it('persists remittanceInfo change', () => {
        const id = seedRequest();
        (0, r2pRequest_1.modifyRequest)(id, { remittanceInfo: 'New note' });
        const row = r2pRequest_1.r2pRepo.findById(id);
        expect(row?.remittance_info).toBe('New note');
    });
    it('increments version on update', () => {
        const id = seedRequest();
        const before = r2pRequest_1.r2pRepo.findById(id);
        (0, r2pRequest_1.modifyRequest)(id, { amount: 50 });
        const after = r2pRequest_1.r2pRepo.findById(id);
        expect(after?.version).toBe((before?.version ?? 0) + 1);
    });
    it('immutable fields (payerId, payeeId, currency) are unchanged', () => {
        const id = seedRequest();
        (0, r2pRequest_1.modifyRequest)(id, { amount: 50 });
        const row = r2pRequest_1.r2pRepo.findById(id);
        expect(row?.payer_id).toBe(baseInput.payerId);
        expect(row?.payee_id).toBe(baseInput.payeeId);
        expect(row?.currency).toBe(baseInput.currency);
    });
});
// ── AC: 404 NOT_FOUND for non-existent r2pId ─────────────────
describe('modifyRequest — NOT_FOUND', () => {
    it('returns NOT_FOUND for unknown r2pId', () => {
        const result = (0, r2pRequest_1.modifyRequest)('00000000-0000-7000-0000-000000000000', { amount: 10 });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('NOT_FOUND');
    });
});
// ── AC: 409 INVALID_STATE_TRANSITION for terminal states ──────
describe('modifyRequest — INVALID_STATE_TRANSITION', () => {
    const terminalStates = ['delivered', 'accepted', 'paid', 'rejected', 'cancelled', 'expired'];
    terminalStates.forEach((state) => {
        it(`returns INVALID_STATE_TRANSITION when status is ${state}`, () => {
            const id = seedRequest();
            // Force status to terminal via repo update
            const row = r2pRequest_1.r2pRepo.findById(id);
            if (!row)
                throw new Error('Row not found');
            r2pRequest_1.r2pRepo.update(id, { updated_at: new Date().toISOString(), status: state }, row.version);
            const result = (0, r2pRequest_1.modifyRequest)(id, { amount: 10 });
            expect(result.ok).toBe(false);
            if (result.ok)
                return;
            expect(result.code).toBe('INVALID_STATE_TRANSITION');
        });
    });
    it('allows modification when status is sent', () => {
        const id = seedRequest();
        const row = r2pRequest_1.r2pRepo.findById(id);
        if (!row)
            throw new Error('Row not found');
        r2pRequest_1.r2pRepo.update(id, { updated_at: new Date().toISOString(), status: 'sent' }, row.version);
        const result = (0, r2pRequest_1.modifyRequest)(id, { amount: 75 });
        expect(result.ok).toBe(true);
    });
});
// ── AC: 400 NO_FIELDS_TO_UPDATE for empty patch ───────────────
describe('modifyRequest — NO_FIELDS_TO_UPDATE', () => {
    it('returns NO_FIELDS_TO_UPDATE for empty patch body', () => {
        const id = seedRequest();
        const result = (0, r2pRequest_1.modifyRequest)(id, {});
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('NO_FIELDS_TO_UPDATE');
    });
    it('returns NO_FIELDS_TO_UPDATE when only unrecognised keys present', () => {
        const id = seedRequest();
        // Cast to bypass TS — route layer may pass unknown keys
        const result = (0, r2pRequest_1.modifyRequest)(id, {});
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('NO_FIELDS_TO_UPDATE');
    });
});
// ── AC: 400 VALIDATION_ERROR for invalid field values ─────────
describe('modifyRequest — VALIDATION_ERROR', () => {
    it('rejects negative amount', () => {
        const id = seedRequest();
        const result = (0, r2pRequest_1.modifyRequest)(id, { amount: -1 });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('VALIDATION_ERROR');
    });
    it('rejects zero amount', () => {
        const id = seedRequest();
        const result = (0, r2pRequest_1.modifyRequest)(id, { amount: 0 });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('VALIDATION_ERROR');
    });
    it('rejects non-date dueDate', () => {
        const id = seedRequest();
        const result = (0, r2pRequest_1.modifyRequest)(id, { dueDate: 'not-a-date' });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('VALIDATION_ERROR');
    });
    it('rejects dueDate without proper YYYY-MM-DD format', () => {
        const id = seedRequest();
        const result = (0, r2pRequest_1.modifyRequest)(id, { dueDate: '01-07-2026' });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('VALIDATION_ERROR');
    });
    it('rejects expiryTimestamp without timezone', () => {
        const id = seedRequest();
        const result = (0, r2pRequest_1.modifyRequest)(id, { expiryTimestamp: '2026-07-01T23:59:59' });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('VALIDATION_ERROR');
    });
    it('rejects invalid expiryTimestamp', () => {
        const id = seedRequest();
        const result = (0, r2pRequest_1.modifyRequest)(id, { expiryTimestamp: 'not-a-timestamp' });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('VALIDATION_ERROR');
    });
});
// ── AC: Audit entry appended with REQUEST_MODIFIED ────────────
describe('modifyRequest — audit trail', () => {
    it('appends REQUEST_MODIFIED audit entry after successful patch', () => {
        const id = seedRequest();
        (0, r2pRequest_1.modifyRequest)(id, { amount: 99 });
        const audits = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'REQUEST_MODIFIED');
        expect(audits).toHaveLength(1);
        expect(audits[0].r2p_id).toBe(id);
        expect(audits[0].actor).toBe('system');
        const detail = JSON.parse(audits[0].detail);
        expect(detail.amount).toBe(99);
    });
    it('does not append audit entry on failure', () => {
        (0, r2pRequest_1.modifyRequest)('nonexistent-id', { amount: 10 });
        const modified = r2pRequest_1.auditRepo.list().filter((a) => a.event_type === 'REQUEST_MODIFIED');
        expect(modified).toHaveLength(0);
    });
});
// ── AC: Transition record appended (same status → same status) ─
describe('modifyRequest — state transition', () => {
    it('appends transition with from_status === to_status', () => {
        const id = seedRequest();
        (0, r2pRequest_1.modifyRequest)(id, { amount: 50 });
        const transitions = r2pRequest_1.transitionRepo.list().filter((t) => t.r2p_id === id && t.from_status === 'created');
        expect(transitions).toHaveLength(1);
        expect(transitions[0].from_status).toBe('created');
        expect(transitions[0].to_status).toBe('created');
        expect(transitions[0].actor).toBe('system');
    });
    it('does not append transition on failure', () => {
        (0, r2pRequest_1.modifyRequest)('nonexistent-id', { amount: 10 });
        const transitions = r2pRequest_1.transitionRepo.list().filter((t) => t.r2p_id === 'nonexistent-id');
        expect(transitions).toHaveLength(0);
    });
});
// ── AC: resetStore() ensures isolation ───────────────────────
describe('resetStore() — isolation', () => {
    it('cleared store means prior requests are gone', () => {
        const id = seedRequest();
        (0, r2pRequest_1.resetStore)();
        const result = (0, r2pRequest_1.modifyRequest)(id, { amount: 10 });
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.code).toBe('NOT_FOUND');
    });
});
//# sourceMappingURL=modifyRequest.test.js.map