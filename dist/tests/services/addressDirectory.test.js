"use strict";
// src/tests/services/addressDirectory.test.ts
// Unit tests for the address directory service layer.
// Covers spec-required ACs from src/specs/1.3-spec.md.
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("../../db/store");
const addressDirectory_1 = require("../../services/addressDirectory");
const addressDirectory_2 = require("../../routes/addressDirectory");
const seed_1 = require("../../db/seed");
// ── Mock req/res helpers for route handler tests ──────────────
function makeReq(query) {
    return {
        params: {},
        query: query,
        body: undefined,
    };
}
function makeRes() {
    const res = {
        statusCode: 200,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.body = data;
            return this;
        },
    };
    return res;
}
beforeEach(() => {
    (0, store_1.resetStore)();
});
// ── listAddresses ─────────────────────────────────────────────
describe('listAddresses', () => {
    it('returns all seeded entries', () => {
        const entries = (0, addressDirectory_1.listAddresses)();
        expect(entries).toHaveLength(seed_1.TEST_PARTICIPANTS.length);
    });
});
// ── resolveProxy ──────────────────────────────────────────────
describe('resolveProxy', () => {
    it('resolves a known email proxy', () => {
        const result = (0, addressDirectory_1.resolveProxy)({ proxyType: 'email', proxyValue: 'payer@banka.ca' });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.participantId).toBe('BANK_A');
        }
    });
    it('resolves a known phone proxy', () => {
        const result = (0, addressDirectory_1.resolveProxy)({ proxyType: 'phone', proxyValue: '+16135550001' });
        expect(result.ok).toBe(true);
        if (result.ok)
            expect(result.value.participantId).toBe('BANK_C');
    });
    it('returns 404 for unknown proxy', () => {
        const result = (0, addressDirectory_1.resolveProxy)({ proxyType: 'email', proxyValue: 'nobody@nowhere.ca' });
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error.status).toBe(404);
    });
    it('returns 400 when proxyType is missing', () => {
        const result = (0, addressDirectory_1.resolveProxy)({ proxyType: '', proxyValue: 'payer@banka.ca' });
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error.status).toBe(400);
    });
    it('returns 400 when proxyValue is missing', () => {
        const result = (0, addressDirectory_1.resolveProxy)({ proxyType: 'email', proxyValue: '' });
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error.status).toBe(400);
    });
    it('returns 404 for inactive entry', () => {
        // Deactivate BANK_A first
        const found = (0, addressDirectory_1.getAddressByParticipant)('BANK_A');
        if (found.ok)
            (0, addressDirectory_1.updateAddress)(found.value.id, { active: false });
        const result = (0, addressDirectory_1.resolveProxy)({ proxyType: 'email', proxyValue: 'payer@banka.ca' });
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error.status).toBe(404);
    });
});
// ── getAddress ────────────────────────────────────────────────
describe('getAddress', () => {
    it('returns an entry by id', () => {
        const all = (0, addressDirectory_1.listAddresses)();
        const first = all[0];
        const result = (0, addressDirectory_1.getAddress)(first.id);
        expect(result.ok).toBe(true);
        if (result.ok)
            expect(result.value.id).toBe(first.id);
    });
    it('returns 404 for unknown id', () => {
        const result = (0, addressDirectory_1.getAddress)('non-existent-uuid');
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error.status).toBe(404);
    });
});
// ── getAddressByParticipant ───────────────────────────────────
describe('getAddressByParticipant', () => {
    it('returns an entry for a known participant', () => {
        const result = (0, addressDirectory_1.getAddressByParticipant)('BANK_B');
        expect(result.ok).toBe(true);
        if (result.ok)
            expect(result.value.participantId).toBe('BANK_B');
    });
    it('returns 404 for unknown participant', () => {
        const result = (0, addressDirectory_1.getAddressByParticipant)('UNKNOWN_BANK');
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error.status).toBe(404);
    });
});
// ── registerAddress ───────────────────────────────────────────
describe('registerAddress', () => {
    it('registers a valid new address', () => {
        const result = (0, addressDirectory_1.registerAddress)({
            participantId: 'BANK_NEW',
            proxyType: 'email',
            proxyValue: 'new@banknew.ca',
            endpointUrl: 'http://localhost:5000',
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.participantId).toBe('BANK_NEW');
            expect(result.value.active).toBe(true);
        }
    });
    it('returns 409 for duplicate participantId', () => {
        const result = (0, addressDirectory_1.registerAddress)({
            participantId: 'BANK_A',
            proxyType: 'alias',
            proxyValue: 'dup-alias',
            endpointUrl: 'http://localhost:5001',
        });
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error.status).toBe(409);
    });
    it('returns 409 for duplicate proxy', () => {
        const result = (0, addressDirectory_1.registerAddress)({
            participantId: 'BANK_NEW2',
            proxyType: 'email',
            proxyValue: 'payer@banka.ca', // already used by BANK_A
            endpointUrl: 'http://localhost:5002',
        });
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error.status).toBe(409);
    });
    it('returns 400 for invalid proxyType', () => {
        const result = (0, addressDirectory_1.registerAddress)({
            participantId: 'BANK_X',
            proxyType: 'unknown',
            proxyValue: 'some-value',
            endpointUrl: 'http://localhost:5003',
        });
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error.status).toBe(400);
    });
    it('returns 400 for invalid endpointUrl', () => {
        const result = (0, addressDirectory_1.registerAddress)({
            participantId: 'BANK_X',
            proxyType: 'alias',
            proxyValue: 'some-alias',
            endpointUrl: 'not-a-url',
        });
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error.status).toBe(400);
    });
});
// ── updateAddress ─────────────────────────────────────────────
describe('updateAddress', () => {
    it('updates endpointUrl', () => {
        const found = (0, addressDirectory_1.getAddressByParticipant)('BANK_D');
        expect(found.ok).toBe(true);
        if (!found.ok)
            return;
        const result = (0, addressDirectory_1.updateAddress)(found.value.id, { endpointUrl: 'http://localhost:8888' });
        expect(result.ok).toBe(true);
        if (result.ok)
            expect(result.value.endpointUrl).toBe('http://localhost:8888');
    });
    it('deactivates an address', () => {
        const found = (0, addressDirectory_1.getAddressByParticipant)('BANK_E');
        expect(found.ok).toBe(true);
        if (!found.ok)
            return;
        const result = (0, addressDirectory_1.updateAddress)(found.value.id, { active: false });
        expect(result.ok).toBe(true);
        if (result.ok)
            expect(result.value.active).toBe(false);
    });
    it('returns 400 for invalid endpointUrl', () => {
        const all = (0, addressDirectory_1.listAddresses)();
        const result = (0, addressDirectory_1.updateAddress)(all[0].id, { endpointUrl: 'bad-url' });
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error.status).toBe(400);
    });
    it('returns 404 for unknown id', () => {
        const result = (0, addressDirectory_1.updateAddress)('no-such-id', { active: false });
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error.status).toBe(404);
    });
});
// ── deregisterAddress ─────────────────────────────────────────
describe('deregisterAddress', () => {
    it('removes a known entry', () => {
        const found = (0, addressDirectory_1.getAddressByParticipant)('BANK_C');
        expect(found.ok).toBe(true);
        if (!found.ok)
            return;
        const result = (0, addressDirectory_1.deregisterAddress)(found.value.id);
        expect(result.ok).toBe(true);
        const check = (0, addressDirectory_1.getAddressByParticipant)('BANK_C');
        expect(check.ok).toBe(false);
    });
    it('returns 404 for unknown id', () => {
        const result = (0, addressDirectory_1.deregisterAddress)('ghost-id');
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error.status).toBe(404);
    });
});
// ──────────────────────────────────────────────────────────────
// Spec AC: resolve() — returns ParticipantAddress (ticket 1.3)
// ──────────────────────────────────────────────────────────────
describe('resolve() — spec-required ParticipantAddress return', () => {
    it('AC1: resolve(email, payer@banka.ca) returns BANK_A ParticipantAddress', () => {
        const addr = (0, addressDirectory_1.resolve)('email', 'payer@banka.ca');
        expect(addr).not.toBeNull();
        const a = addr;
        expect(a.participantId).toBe('BANK_A');
        expect(a.participantEndpoint).toBe('http://localhost:4001');
        expect(a.accountRef).toBe('ACC-BANKA-001');
        expect(a.ttlSeconds).toBe(300);
    });
    it('AC2: resolve(phone, +16135550001) returns BANK_C ParticipantAddress', () => {
        const addr = (0, addressDirectory_1.resolve)('phone', '+16135550001');
        expect(addr).not.toBeNull();
        const a = addr;
        expect(a.participantId).toBe('BANK_C');
        expect(a.participantEndpoint).toBe('http://localhost:4003');
        expect(a.accountRef).toBe('ACC-BANKC-001');
        expect(a.ttlSeconds).toBe(300);
    });
    it('AC3: resolve(alias, corp-alias-1) returns BANK_E ParticipantAddress', () => {
        const addr = (0, addressDirectory_1.resolve)('alias', 'corp-alias-1');
        expect(addr).not.toBeNull();
        const a = addr;
        expect(a.participantId).toBe('BANK_E');
        expect(a.participantEndpoint).toBe('http://localhost:4005');
        expect(a.accountRef).toBe('ACC-BANKE-001');
        expect(a.ttlSeconds).toBe(300);
    });
    it('AC4: resolve(email, unknown@value.ca) returns null', () => {
        expect((0, addressDirectory_1.resolve)('email', 'unknown@value.ca')).toBeNull();
    });
    it('resolve(phone, unknown) returns null', () => {
        expect((0, addressDirectory_1.resolve)('phone', '+10000000000')).toBeNull();
    });
    it('resolve(alias, unknown) returns null', () => {
        expect((0, addressDirectory_1.resolve)('alias', 'no-such-alias')).toBeNull();
    });
    it('resolves BANK_B via email correctly', () => {
        const addr = (0, addressDirectory_1.resolve)('email', 'payee@bankb.ca');
        expect(addr?.participantId).toBe('BANK_B');
        expect(addr?.participantEndpoint).toBe('http://localhost:4002');
        expect(addr?.accountRef).toBe('ACC-BANKB-001');
    });
    it('resolves BANK_D via phone correctly', () => {
        const addr = (0, addressDirectory_1.resolve)('phone', '+14165550002');
        expect(addr?.participantId).toBe('BANK_D');
        expect(addr?.participantEndpoint).toBe('http://localhost:4004');
        expect(addr?.accountRef).toBe('ACC-BANKD-001');
    });
});
// ──────────────────────────────────────────────────────────────
// Spec AC: isValidProxyType helper
// ──────────────────────────────────────────────────────────────
describe('isValidProxyType()', () => {
    it('accepts email', () => expect((0, addressDirectory_1.isValidProxyType)('email')).toBe(true));
    it('accepts phone', () => expect((0, addressDirectory_1.isValidProxyType)('phone')).toBe(true));
    it('accepts alias', () => expect((0, addressDirectory_1.isValidProxyType)('alias')).toBe(true));
    it('rejects fax', () => expect((0, addressDirectory_1.isValidProxyType)('fax')).toBe(false));
    it('rejects empty string', () => expect((0, addressDirectory_1.isValidProxyType)('')).toBe(false));
});
// ──────────────────────────────────────────────────────────────
// Spec AC: internalResolveHandler
// GET /internal/address-directory/resolve
// Tests use mock req/res (no HTTP server needed)
// ──────────────────────────────────────────────────────────────
describe('internalResolveHandler — GET /internal/address-directory/resolve', () => {
    it('AC5: 200 with ParticipantAddress for known email proxy', () => {
        const req = makeReq({ proxyType: 'email', proxyValue: 'payer@banka.ca' });
        const res = makeRes();
        (0, addressDirectory_2.internalResolveHandler)(req, res, () => { });
        expect(res.statusCode).toBe(200);
        const body = res.body;
        expect(body.participantId).toBe('BANK_A');
        expect(body.participantEndpoint).toBe('http://localhost:4001');
        expect(body.accountRef).toBe('ACC-BANKA-001');
        expect(body.ttlSeconds).toBe(300);
    });
    it('AC6: 404 PARTICIPANT_NOT_FOUND for unknown proxyValue', () => {
        const req = makeReq({ proxyType: 'email', proxyValue: 'unknown@value.ca' });
        const res = makeRes();
        (0, addressDirectory_2.internalResolveHandler)(req, res, () => { });
        expect(res.statusCode).toBe(404);
        expect(res.body.code).toBe('PARTICIPANT_NOT_FOUND');
    });
    it('AC7: 400 INVALID_PROXY_TYPE for proxyType=fax', () => {
        const req = makeReq({ proxyType: 'fax', proxyValue: 'something' });
        const res = makeRes();
        (0, addressDirectory_2.internalResolveHandler)(req, res, () => { });
        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_PROXY_TYPE');
    });
    it('AC8a: 400 when proxyType is missing', () => {
        const req = makeReq({ proxyValue: 'payer@banka.ca' });
        const res = makeRes();
        (0, addressDirectory_2.internalResolveHandler)(req, res, () => { });
        expect(res.statusCode).toBe(400);
    });
    it('AC8b: 400 when proxyValue is missing', () => {
        const req = makeReq({ proxyType: 'email' });
        const res = makeRes();
        (0, addressDirectory_2.internalResolveHandler)(req, res, () => { });
        expect(res.statusCode).toBe(400);
    });
    it('AC8c: 400 when both params are missing', () => {
        const req = makeReq({});
        const res = makeRes();
        (0, addressDirectory_2.internalResolveHandler)(req, res, () => { });
        expect(res.statusCode).toBe(400);
    });
    it('200 for phone proxy (BANK_C)', () => {
        const req = makeReq({ proxyType: 'phone', proxyValue: '+16135550001' });
        const res = makeRes();
        (0, addressDirectory_2.internalResolveHandler)(req, res, () => { });
        expect(res.statusCode).toBe(200);
        expect(res.body.participantId).toBe('BANK_C');
    });
    it('200 for alias proxy (BANK_E)', () => {
        const req = makeReq({ proxyType: 'alias', proxyValue: 'corp-alias-1' });
        const res = makeRes();
        (0, addressDirectory_2.internalResolveHandler)(req, res, () => { });
        expect(res.statusCode).toBe(200);
        expect(res.body.participantId).toBe('BANK_E');
    });
    it('400 INVALID_PROXY_TYPE for empty proxyType string', () => {
        const req = makeReq({ proxyType: '', proxyValue: 'payer@banka.ca' });
        const res = makeRes();
        (0, addressDirectory_2.internalResolveHandler)(req, res, () => { });
        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_PROXY_TYPE');
    });
});
//# sourceMappingURL=addressDirectory.test.js.map