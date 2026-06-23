"use strict";
// src/db/repository.ts
// Repository layer for Address Directory.
// Wraps the in-memory store and enforces business constraints.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAll = getAll;
exports.getById = getById;
exports.getByParticipantId = getByParticipantId;
exports.getByProxy = getByProxy;
exports.create = create;
exports.update = update;
exports.remove = remove;
const store_1 = require("./store");
function ok(value) {
    return { ok: true, value };
}
function fail(code, message) {
    return { ok: false, error: { code, message } };
}
// ── queries ───────────────────────────────────────────────────
function getAll() {
    return (0, store_1.listAll)();
}
function getById(id) {
    const entry = (0, store_1.findById)(id);
    if (!entry)
        return fail('NOT_FOUND', `No address entry found for id "${id}"`);
    return ok(entry);
}
function getByParticipantId(participantId) {
    const entry = (0, store_1.findByParticipantId)(participantId);
    if (!entry)
        return fail('NOT_FOUND', `No address entry found for participantId "${participantId}"`);
    return ok(entry);
}
function getByProxy(proxyType, proxyValue) {
    const entry = (0, store_1.findByProxy)(proxyType, proxyValue);
    if (!entry) {
        return fail('NOT_FOUND', `No address entry found for proxy ${proxyType}:${proxyValue}`);
    }
    return ok(entry);
}
// ── mutations ─────────────────────────────────────────────────
function create(input) {
    if ((0, store_1.findByParticipantId)(input.participantId)) {
        return fail('CONFLICT', `Address entry already exists for participantId "${input.participantId}"`);
    }
    if ((0, store_1.findByProxy)(input.proxyType, input.proxyValue)) {
        return fail('CONFLICT', `Address entry already exists for proxy ${input.proxyType}:${input.proxyValue}`);
    }
    return ok((0, store_1.createEntry)(input));
}
function update(id, input) {
    const result = (0, store_1.updateEntry)(id, input);
    if (!result)
        return fail('NOT_FOUND', `No address entry found for id "${id}"`);
    return ok(result);
}
function remove(id) {
    const deleted = (0, store_1.deleteEntry)(id);
    if (!deleted)
        return fail('NOT_FOUND', `No address entry found for id "${id}"`);
    return ok(true);
}
//# sourceMappingURL=repository.js.map