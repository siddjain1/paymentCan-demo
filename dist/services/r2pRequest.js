"use strict";
// src/services/r2pRequest.ts
// Service layer for R2P request creation.
// Uses in-memory stores for requests, audit log, and state transitions.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ackRepo = exports.responseRepo = exports.transitionRepo = exports.auditRepo = exports.r2pRepo = void 0;
exports.generateR2PId = generateR2PId;
exports.resetStore = resetStore;
exports.createRequest = createRequest;
exports.modifyRequest = modifyRequest;
exports.cancelRequest = cancelRequest;
exports.acknowledgeRequest = acknowledgeRequest;
exports.respondToRequest = respondToRequest;
const crypto_1 = require("crypto");
const addressDirectory_1 = require("./addressDirectory");
const routingEngine_1 = require("./routingEngine");
// ── In-memory stores ──────────────────────────────────────────
const requestsByIdempotencyKey = new Map();
const requestsById = new Map();
const auditLog = [];
const stateTransitions = [];
const acknowledgements = new Map();
const responses = new Map();
// ── ID generation ─────────────────────────────────────────────
/**
 * Generates a UUID v7 (time-ordered).
 * Structure: {8 hex ts}-{4 hex ts}-7{3 hex rand}-{4 hex rand}-{12 hex rand}
 */
function generateR2PId() {
    const ts = Date.now().toString(16).padStart(12, '0');
    const rand = (0, crypto_1.randomUUID)().replace(/-/g, '').slice(12);
    return `${ts.slice(0, 8)}-${ts.slice(8)}-7${rand.slice(0, 3)}-${rand.slice(3, 7)}-${rand.slice(7, 19)}`;
}
// ── Repository helpers ────────────────────────────────────────
exports.r2pRepo = {
    findByIdempotencyKey(key) {
        return requestsByIdempotencyKey.get(key);
    },
    save(row) {
        requestsByIdempotencyKey.set(row.idempotency_key, row);
        requestsById.set(row.id, row);
    },
    findById(id) {
        return requestsById.get(id);
    },
    listAll() {
        return Array.from(requestsById.values());
    },
    update(id, fields, expectedVersion) {
        const current = requestsById.get(id);
        if (!current)
            throw new Error(`Record not found: ${id}`);
        if (current.version !== expectedVersion)
            throw new Error(`Version mismatch: expected ${expectedVersion}, got ${current.version}`);
        const updated = { ...current, ...fields, version: current.version + 1 };
        requestsById.set(id, updated);
        requestsByIdempotencyKey.set(updated.idempotency_key, updated);
        return updated;
    },
};
exports.auditRepo = {
    append(entry) {
        auditLog.push({ ...entry, created_at: new Date().toISOString() });
    },
    list() {
        return [...auditLog];
    },
};
exports.transitionRepo = {
    append(entry) {
        stateTransitions.push({ ...entry, created_at: new Date().toISOString() });
    },
    list() {
        return [...stateTransitions];
    },
};
exports.responseRepo = {
    findByR2PId(r2pId) {
        return responses.get(r2pId);
    },
    save(row) {
        responses.set(row.r2p_id, row);
    },
    list() {
        return Array.from(responses.values());
    },
};
exports.ackRepo = {
    findByR2PId(r2pId) {
        return acknowledgements.get(r2pId);
    },
    save(row) {
        acknowledgements.set(row.r2p_id, row);
    },
    list() {
        return Array.from(acknowledgements.values());
    },
};
// ── Test helpers ──────────────────────────────────────────────
/** Reset all in-memory stores. Only for use in tests. */
function resetStore() {
    requestsByIdempotencyKey.clear();
    requestsById.clear();
    auditLog.length = 0;
    stateTransitions.length = 0;
    acknowledgements.clear();
    responses.clear();
}
// ── Service ───────────────────────────────────────────────────
function createRequest(input) {
    // 1. Idempotency check
    if (exports.r2pRepo.findByIdempotencyKey(input.idempotencyKey)) {
        return { ok: false, code: 'DUPLICATE_REQUEST', message: 'A request with this idempotency key already exists' };
    }
    // 2. Resolve payer proxy (treat payerId as email proxy per spec POC)
    const resolved = (0, addressDirectory_1.resolve)('email', input.payerId);
    if (!resolved) {
        return { ok: false, code: 'PAYER_NOT_FOUND', message: `Payer proxy not found: ${input.payerId}` };
    }
    // 3. Generate r2pId
    const r2pId = generateR2PId();
    const now = new Date().toISOString();
    // 4. Persist request
    const row = {
        id: r2pId,
        idempotency_key: input.idempotencyKey,
        payer_id: input.payerId,
        payee_id: input.payeeId,
        originating_participant_id: 'PLATFORM',
        receiving_participant_id: resolved.participantId,
        amount: input.amount,
        currency: input.currency,
        due_date: input.dueDate,
        expiry_timestamp: input.expiryTimestamp,
        remittance_info: input.remittanceInfo ?? null,
        status: 'created',
        version: 0,
        created_at: now,
        updated_at: now,
    };
    exports.r2pRepo.save(row);
    // 5. Audit trail
    exports.auditRepo.append({
        r2p_id: r2pId,
        event_type: 'REQUEST_CREATED',
        actor: 'system',
        detail: JSON.stringify(input),
    });
    // 6. State transition
    exports.transitionRepo.append({
        r2p_id: r2pId,
        from_status: null,
        to_status: 'created',
        actor: 'system',
    });
    // 7. Route to receiving participant (fire-and-forget — ticket 3.1)
    // Deferred to next tick so createRequest() returns 'created' before dispatch mutates state.
    setTimeout(() => {
        void (0, routingEngine_1.dispatch)(r2pId, resolved.participantEndpoint, {
            r2pId,
            payerId: input.payerId,
            payeeId: input.payeeId,
            amount: input.amount,
            currency: input.currency,
            dueDate: input.dueDate,
        });
    }, 0);
    // 8. Return
    return { ok: true, r2pId, status: 'created', createdAt: row.created_at };
}
// ── modifyRequest ─────────────────────────────────────────────
const MODIFIABLE_STATES = ['created', 'sent'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(s) {
    if (!DATE_RE.test(s))
        return false;
    const d = new Date(s);
    return !isNaN(d.getTime());
}
function isValidISO8601WithTimezone(s) {
    // Must have timezone indicator: Z or +/-HH:MM
    if (!/Z$|[+-]\d{2}:\d{2}$/.test(s))
        return false;
    const d = new Date(s);
    return !isNaN(d.getTime());
}
function modifyRequest(r2pId, patch) {
    // 1. Empty patch check
    const recognisedKeys = ['amount', 'dueDate', 'expiryTimestamp', 'remittanceInfo'];
    const presentKeys = recognisedKeys.filter((k) => k in patch);
    if (presentKeys.length === 0) {
        return { ok: false, code: 'NO_FIELDS_TO_UPDATE', message: 'Patch body is empty or contains no recognised fields' };
    }
    // 2. Fetch
    const current = exports.r2pRepo.findById(r2pId);
    if (!current) {
        return { ok: false, code: 'NOT_FOUND', message: `Request not found: ${r2pId}` };
    }
    // 3. State guard
    if (!MODIFIABLE_STATES.includes(current.status)) {
        return { ok: false, code: 'INVALID_STATE_TRANSITION', message: `Cannot modify request in state: ${current.status}` };
    }
    // 4. Field validation
    if ('amount' in patch) {
        const v = patch.amount;
        if (typeof v !== 'number' || !isFinite(v) || v <= 0) {
            return { ok: false, code: 'VALIDATION_ERROR', message: 'amount must be a finite number greater than 0' };
        }
    }
    if ('dueDate' in patch) {
        if (typeof patch.dueDate !== 'string' || !isValidDate(patch.dueDate)) {
            return { ok: false, code: 'VALIDATION_ERROR', message: 'dueDate must be a valid date in YYYY-MM-DD format' };
        }
    }
    if ('expiryTimestamp' in patch) {
        if (typeof patch.expiryTimestamp !== 'string' || !isValidISO8601WithTimezone(patch.expiryTimestamp)) {
            return { ok: false, code: 'VALIDATION_ERROR', message: 'expiryTimestamp must be a valid ISO 8601 datetime with timezone' };
        }
    }
    if ('remittanceInfo' in patch) {
        if (typeof patch.remittanceInfo !== 'string') {
            return { ok: false, code: 'VALIDATION_ERROR', message: 'remittanceInfo must be a string' };
        }
    }
    // 5. Apply patch
    const now = new Date().toISOString();
    const updateFields = { updated_at: now };
    if ('amount' in patch)
        updateFields.amount = patch.amount;
    if ('dueDate' in patch)
        updateFields.due_date = patch.dueDate;
    if ('expiryTimestamp' in patch)
        updateFields.expiry_timestamp = patch.expiryTimestamp;
    if ('remittanceInfo' in patch)
        updateFields.remittance_info = patch.remittanceInfo ?? null;
    const updated = exports.r2pRepo.update(r2pId, updateFields, current.version);
    // 6. Audit
    exports.auditRepo.append({
        r2p_id: r2pId,
        event_type: 'REQUEST_MODIFIED',
        actor: 'system',
        detail: JSON.stringify(patch),
    });
    // 7. Transition record (same status → same status)
    exports.transitionRepo.append({
        r2p_id: r2pId,
        from_status: current.status,
        to_status: current.status,
        actor: 'system',
    });
    // 8. Return
    return { ok: true, r2pId, status: updated.status, updatedAt: updated.updated_at };
}
// ── cancelRequest ─────────────────────────────────────────────
const CANCELLABLE_STATES = ['created', 'sent', 'delivered', 'delivery_failed'];
function cancelRequest(r2pId) {
    // 1. Fetch
    const current = exports.r2pRepo.findById(r2pId);
    if (!current) {
        return { ok: false, code: 'NOT_FOUND', message: `Request not found: ${r2pId}` };
    }
    // 2. State guard
    if (!CANCELLABLE_STATES.includes(current.status)) {
        return { ok: false, code: 'INVALID_STATE_TRANSITION', message: `Cannot cancel request in state: ${current.status}` };
    }
    // 3. Apply cancellation
    const now = new Date().toISOString();
    exports.r2pRepo.update(r2pId, { status: 'cancelled', updated_at: now }, current.version);
    // 4. Audit
    exports.auditRepo.append({
        r2p_id: r2pId,
        event_type: 'REQUEST_CANCELLED',
        actor: 'system',
        detail: JSON.stringify({ previousStatus: current.status }),
    });
    // 5. State transition
    exports.transitionRepo.append({
        r2p_id: r2pId,
        from_status: current.status,
        to_status: 'cancelled',
        actor: 'system',
    });
    // 6. Return
    return { ok: true, r2pId, status: 'cancelled', cancelledAt: now };
}
// ── acknowledgeRequest ────────────────────────────────────────
function acknowledgeRequest(r2pId, input) {
    // 1. Fetch
    const current = exports.r2pRepo.findById(r2pId);
    if (!current) {
        return { ok: false, code: 'NOT_FOUND', message: `Request not found: ${r2pId}` };
    }
    // 2. Duplicate ack check
    if (exports.ackRepo.findByR2PId(r2pId)) {
        return { ok: false, code: 'ALREADY_ACKNOWLEDGED', message: 'Request has already been acknowledged' };
    }
    const now = new Date().toISOString();
    // 3. Persist acknowledgement
    exports.ackRepo.save({
        r2p_id: r2pId,
        participant_id: input.participantId,
        received_at: input.receivedAt,
        created_at: now,
    });
    // 4. Transition → delivered
    exports.r2pRepo.update(r2pId, { status: 'delivered', updated_at: now }, current.version);
    // 5. Audit
    exports.auditRepo.append({
        r2p_id: r2pId,
        event_type: 'REQUEST_ACKNOWLEDGED',
        actor: input.participantId,
        detail: JSON.stringify({ participantId: input.participantId, receivedAt: input.receivedAt }),
    });
    // 6. State transition
    exports.transitionRepo.append({
        r2p_id: r2pId,
        from_status: current.status,
        to_status: 'delivered',
        actor: input.participantId,
    });
    // 7. Emit acknowledged event (stub — ticket 6.5)
    exports.auditRepo.append({
        r2p_id: r2pId,
        event_type: 'EVENT_ACKNOWLEDGED_EMITTED',
        actor: 'event-publisher',
        detail: JSON.stringify({ participantId: input.participantId }),
    });
    return { ok: true, r2pId, status: 'delivered' };
}
// ── respondToRequest ──────────────────────────────────────────
const VALID_RESPONSE_TYPES = ['accept', 'decline', 'defer'];
const RESPONSE_STATUS_MAP = {
    accept: 'accepted',
    decline: 'declined',
    defer: 'deferred',
};
function respondToRequest(r2pId, input) {
    // 1. Fetch
    const current = exports.r2pRepo.findById(r2pId);
    if (!current) {
        return { ok: false, code: 'NOT_FOUND', message: `Request not found: ${r2pId}` };
    }
    // 2. State guard
    if (current.status !== 'delivered') {
        return { ok: false, code: 'INVALID_STATE_TRANSITION', message: `Cannot respond to request in state: ${current.status}` };
    }
    // 3. Expiry check
    if (new Date(current.expiry_timestamp) < new Date()) {
        return { ok: false, code: 'EXPIRED', message: 'Request has expired' };
    }
    // 4. Input validation
    if (!VALID_RESPONSE_TYPES.includes(input.responseType)) {
        return { ok: false, code: 'VALIDATION_ERROR', message: 'responseType must be one of: accept, decline, defer' };
    }
    // 5. Amount validation (optional field)
    if (input.amount !== undefined) {
        if (typeof input.amount !== 'number' || !isFinite(input.amount) || input.amount <= 0) {
            return { ok: false, code: 'VALIDATION_ERROR', message: 'amount must be a finite number greater than 0' };
        }
        if (input.amount !== current.amount) {
            return { ok: false, code: 'AMOUNT_MISMATCH', message: `amount ${input.amount} does not match request amount ${current.amount}` };
        }
    }
    const now = new Date().toISOString();
    const newStatus = RESPONSE_STATUS_MAP[input.responseType];
    // 5. Persist response
    exports.responseRepo.save({
        response_id: (0, crypto_1.randomUUID)(),
        r2p_id: r2pId,
        response_type: input.responseType,
        responding_participant_id: input.participantId,
        responded_at: input.respondedAt,
        created_at: now,
    });
    // 6. Transition status
    exports.r2pRepo.update(r2pId, { status: newStatus, updated_at: now }, current.version);
    exports.transitionRepo.append({
        r2p_id: r2pId,
        from_status: 'delivered',
        to_status: newStatus,
        actor: input.participantId,
    });
    // 7. Audit
    exports.auditRepo.append({
        r2p_id: r2pId,
        event_type: `RESPONSE_${input.responseType.toUpperCase()}`,
        actor: input.participantId,
        detail: JSON.stringify({ responseType: input.responseType, respondedAt: input.respondedAt }),
    });
    // 8. Accept → trigger Payment Execution Engine (stub — ticket 5.1)
    if (input.responseType === 'accept') {
        exports.auditRepo.append({
            r2p_id: r2pId,
            event_type: 'PAYMENT_TRIGGERED',
            actor: 'payment-engine',
            detail: JSON.stringify({ r2pId, triggeredAt: now }),
        });
    }
    // 9. Notify originating participant (stub — ticket 6.5)
    exports.auditRepo.append({
        r2p_id: r2pId,
        event_type: 'EVENT_RESPONDED_EMITTED',
        actor: 'event-publisher',
        detail: JSON.stringify({ responseType: input.responseType, participantId: input.participantId }),
    });
    return { ok: true, r2pId, status: newStatus };
}
//# sourceMappingURL=r2pRequest.js.map