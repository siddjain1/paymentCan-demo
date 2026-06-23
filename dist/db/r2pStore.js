"use strict";
// src/db/r2pStore.ts
// In-memory store for R2P requests, audit entries, and state transitions.
// No external database — backed by Maps.
Object.defineProperty(exports, "__esModule", { value: true });
exports.findByIdempotencyKey = findByIdempotencyKey;
exports.findRequestById = findRequestById;
exports.saveRequest = saveRequest;
exports.listRequests = listRequests;
exports.appendAudit = appendAudit;
exports.getAuditLog = getAuditLog;
exports.appendTransition = appendTransition;
exports.getTransitions = getTransitions;
exports.resetR2PStore = resetR2PStore;
const crypto_1 = require("crypto");
// ── Indexes ───────────────────────────────────────────────────
const requestsById = new Map();
const requestsByIdempotencyKey = new Map();
const auditLog = [];
const stateTransitions = [];
// ── Request operations ────────────────────────────────────────
function findByIdempotencyKey(key) {
    return requestsByIdempotencyKey.get(key);
}
function findRequestById(id) {
    return requestsById.get(id);
}
function saveRequest(row) {
    requestsById.set(row.id, row);
    requestsByIdempotencyKey.set(row.idempotency_key, row);
    return row;
}
function listRequests() {
    return Array.from(requestsById.values());
}
function appendAudit(input) {
    const entry = {
        id: (0, crypto_1.randomUUID)(),
        r2p_id: input.r2p_id,
        event_type: input.event_type,
        actor: input.actor,
        detail: input.detail,
        created_at: new Date().toISOString(),
    };
    auditLog.push(entry);
    return entry;
}
function getAuditLog(r2pId) {
    return auditLog.filter((e) => e.r2p_id === r2pId);
}
function appendTransition(input) {
    const transition = {
        id: (0, crypto_1.randomUUID)(),
        r2p_id: input.r2p_id,
        from_status: input.from_status,
        to_status: input.to_status,
        actor: input.actor,
        created_at: new Date().toISOString(),
    };
    stateTransitions.push(transition);
    return transition;
}
function getTransitions(r2pId) {
    return stateTransitions.filter((t) => t.r2p_id === r2pId);
}
// ── Test helpers ──────────────────────────────────────────────
/** Reset all R2P store state. Only for use in tests. */
function resetR2PStore() {
    requestsById.clear();
    requestsByIdempotencyKey.clear();
    auditLog.length = 0;
    stateTransitions.length = 0;
}
//# sourceMappingURL=r2pStore.js.map