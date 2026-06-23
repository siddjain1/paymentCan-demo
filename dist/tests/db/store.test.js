"use strict";
// src/tests/db/store.test.ts
// Unit tests for the in-memory store (src/db/store.ts).
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("../../db/store");
const seed_1 = require("../../db/seed");
beforeEach(() => {
    (0, store_1.resetStore)();
});
describe('store — seed state', () => {
    it('contains all 5 test participants after reset', () => {
        expect((0, store_1.listAll)()).toHaveLength(seed_1.TEST_PARTICIPANTS.length);
    });
    it('finds a seeded participant by participantId', () => {
        const entry = (0, store_1.findByParticipantId)('BANK_A');
        expect(entry).toBeDefined();
        expect(entry?.proxyType).toBe('email');
        expect(entry?.proxyValue).toBe('payer@banka.ca');
        expect(entry?.active).toBe(true);
    });
    it('finds a seeded participant by proxy', () => {
        const entry = (0, store_1.findByProxy)('phone', '+16135550001');
        expect(entry).toBeDefined();
        expect(entry?.participantId).toBe('BANK_C');
    });
});
describe('store — createEntry', () => {
    it('creates a new entry and indexes it', () => {
        const entry = (0, store_1.createEntry)({
            participantId: 'BANK_NEW',
            proxyType: 'email',
            proxyValue: 'new@bank.ca',
            endpointUrl: 'http://localhost:9000',
        });
        expect(entry.id).toBeDefined();
        expect(entry.active).toBe(true);
        expect((0, store_1.findById)(entry.id)).toEqual(entry);
        expect((0, store_1.findByParticipantId)('BANK_NEW')).toEqual(entry);
        expect((0, store_1.findByProxy)('email', 'new@bank.ca')).toEqual(entry);
        expect((0, store_1.listAll)()).toHaveLength(seed_1.TEST_PARTICIPANTS.length + 1);
    });
});
describe('store — updateEntry', () => {
    it('updates endpointUrl and returns the updated entry', () => {
        const original = (0, store_1.findByParticipantId)('BANK_A');
        const updated = (0, store_1.updateEntry)(original.id, { endpointUrl: 'http://localhost:9999' });
        expect(updated).toBeDefined();
        expect(updated?.endpointUrl).toBe('http://localhost:9999');
        // id and participantId must not change
        expect(updated?.id).toBe(original.id);
        expect(updated?.participantId).toBe(original.participantId);
    });
    it('deactivates an entry', () => {
        const original = (0, store_1.findByParticipantId)('BANK_B');
        (0, store_1.updateEntry)(original.id, { active: false });
        const entry = (0, store_1.findById)(original.id);
        expect(entry?.active).toBe(false);
    });
    it('returns undefined for unknown id', () => {
        const result = (0, store_1.updateEntry)('non-existent-id', { active: false });
        expect(result).toBeUndefined();
    });
});
describe('store — deleteEntry', () => {
    it('removes entry from all indexes', () => {
        const entry = (0, store_1.findByParticipantId)('BANK_E');
        const deleted = (0, store_1.deleteEntry)(entry.id);
        expect(deleted).toBe(true);
        expect((0, store_1.findById)(entry.id)).toBeUndefined();
        expect((0, store_1.findByParticipantId)('BANK_E')).toBeUndefined();
        expect((0, store_1.findByProxy)('alias', 'corp-alias-1')).toBeUndefined();
        expect((0, store_1.listAll)()).toHaveLength(seed_1.TEST_PARTICIPANTS.length - 1);
    });
    it('returns false for unknown id', () => {
        expect((0, store_1.deleteEntry)('does-not-exist')).toBe(false);
    });
});
// ── resetStore() AC ───────────────────────────────────────────
describe('resetStore() — clears all in-memory data and re-seeds', () => {
    it('clears custom entries added after seed', () => {
        (0, store_1.createEntry)({
            participantId: 'TEMP_BANK',
            proxyType: 'alias',
            proxyValue: 'temp-alias',
            endpointUrl: 'http://localhost:9999',
        });
        expect((0, store_1.listAll)()).toHaveLength(seed_1.TEST_PARTICIPANTS.length + 1);
        (0, store_1.resetStore)();
        expect((0, store_1.listAll)()).toHaveLength(seed_1.TEST_PARTICIPANTS.length);
        expect((0, store_1.findByParticipantId)('TEMP_BANK')).toBeUndefined();
    });
    it('restores all seed participants after clearing', () => {
        // Remove all entries
        (0, store_1.listAll)().forEach((e) => (0, store_1.deleteEntry)(e.id));
        expect((0, store_1.listAll)()).toHaveLength(0);
        (0, store_1.resetStore)();
        expect((0, store_1.listAll)()).toHaveLength(seed_1.TEST_PARTICIPANTS.length);
        expect((0, store_1.findByParticipantId)('BANK_A')).toBeDefined();
        expect((0, store_1.findByProxy)('phone', '+16135550001')).toBeDefined();
        expect((0, store_1.findByProxy)('alias', 'corp-alias-1')).toBeDefined();
    });
    it('proxy indexes are rebuilt after reset', () => {
        (0, store_1.resetStore)();
        const byEmail = (0, store_1.findByProxy)('email', 'payer@banka.ca');
        expect(byEmail?.participantId).toBe('BANK_A');
    });
});
//# sourceMappingURL=store.test.js.map