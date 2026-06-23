"use strict";
// src/db/store.ts
// In-memory store for Address Directory entries.
// Backed by a Map — no external database required.
Object.defineProperty(exports, "__esModule", { value: true });
exports.findById = findById;
exports.findByParticipantId = findByParticipantId;
exports.findByProxy = findByProxy;
exports.listAll = listAll;
exports.createEntry = createEntry;
exports.updateEntry = updateEntry;
exports.deleteEntry = deleteEntry;
exports.resetStore = resetStore;
const crypto_1 = require("crypto");
const seed_1 = require("./seed");
function toEntry(p) {
    const now = new Date().toISOString();
    return {
        id: (0, crypto_1.randomUUID)(),
        participantId: p.participantId,
        proxyType: p.proxyType,
        proxyValue: p.proxyValue,
        endpointUrl: p.endpointUrl,
        active: true,
        createdAt: now,
        updatedAt: now,
    };
}
// Primary index: id -> entry
const byId = new Map();
// Secondary index: participantId -> entry
const byParticipantId = new Map();
// Secondary index: "proxyType:proxyValue" -> entry
const byProxy = new Map();
function proxyKey(proxyType, proxyValue) {
    return `${proxyType}:${proxyValue}`;
}
function addToIndexes(entry) {
    byId.set(entry.id, entry);
    byParticipantId.set(entry.participantId, entry);
    byProxy.set(proxyKey(entry.proxyType, entry.proxyValue), entry);
}
function removeFromIndexes(entry) {
    byId.delete(entry.id);
    byParticipantId.delete(entry.participantId);
    byProxy.delete(proxyKey(entry.proxyType, entry.proxyValue));
}
// Seed from TEST_PARTICIPANTS on first import
seed_1.TEST_PARTICIPANTS.forEach((p) => {
    if (!byParticipantId.has(p.participantId)) {
        addToIndexes(toEntry(p));
    }
});
// ── read ──────────────────────────────────────────────────────
function findById(id) {
    return byId.get(id);
}
function findByParticipantId(participantId) {
    return byParticipantId.get(participantId);
}
function findByProxy(proxyType, proxyValue) {
    return byProxy.get(proxyKey(proxyType, proxyValue));
}
function listAll() {
    return Array.from(byId.values());
}
function createEntry(input) {
    const now = new Date().toISOString();
    const entry = {
        id: (0, crypto_1.randomUUID)(),
        participantId: input.participantId,
        proxyType: input.proxyType,
        proxyValue: input.proxyValue,
        endpointUrl: input.endpointUrl,
        active: true,
        createdAt: now,
        updatedAt: now,
    };
    addToIndexes(entry);
    return entry;
}
function updateEntry(id, input) {
    const existing = byId.get(id);
    if (!existing)
        return undefined;
    const updated = {
        ...existing,
        ...(input.endpointUrl !== undefined ? { endpointUrl: input.endpointUrl } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        updatedAt: new Date().toISOString(),
    };
    removeFromIndexes(existing);
    addToIndexes(updated);
    return updated;
}
function deleteEntry(id) {
    const existing = byId.get(id);
    if (!existing)
        return false;
    removeFromIndexes(existing);
    return true;
}
// ── test helpers ──────────────────────────────────────────────
/** Reset the store to the seeded state. Only for use in tests. */
function resetStore() {
    byId.clear();
    byParticipantId.clear();
    byProxy.clear();
    seed_1.TEST_PARTICIPANTS.forEach((p) => addToIndexes(toEntry(p)));
}
//# sourceMappingURL=store.js.map