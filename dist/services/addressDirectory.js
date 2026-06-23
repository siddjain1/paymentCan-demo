"use strict";
// src/services/addressDirectory.ts
// Service layer for Address Directory.
// Translates repository results into service-level responses.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolve = resolve;
exports.isValidProxyType = isValidProxyType;
exports.listAddresses = listAddresses;
exports.resolveProxy = resolveProxy;
exports.getAddress = getAddress;
exports.getAddressByParticipant = getAddressByParticipant;
exports.registerAddress = registerAddress;
exports.updateAddress = updateAddress;
exports.deregisterAddress = deregisterAddress;
const repo = __importStar(require("../db/repository"));
const VALID_PROXY_TYPES = new Set(['email', 'phone', 'alias']);
/** Account refs follow the pattern ACC-{BANKX}-001. */
const ACCOUNT_REF_MAP = {
    BANK_A: 'ACC-BANKA-001',
    BANK_B: 'ACC-BANKB-001',
    BANK_C: 'ACC-BANKC-001',
    BANK_D: 'ACC-BANKD-001',
    BANK_E: 'ACC-BANKE-001',
};
/**
 * Core spec function: resolves a proxy identifier to a ParticipantAddress.
 * Returns null when no participant is registered for the given proxy.
 */
function resolve(proxyType, proxyValue) {
    const result = repo.getByProxy(proxyType, proxyValue);
    if (!result.ok)
        return null;
    const entry = result.value;
    if (!entry.active)
        return null;
    return {
        participantId: entry.participantId,
        participantEndpoint: entry.endpointUrl,
        accountRef: ACCOUNT_REF_MAP[entry.participantId] ?? `ACC-${entry.participantId}-001`,
        ttlSeconds: 300,
    };
}
function isValidProxyType(value) {
    return VALID_PROXY_TYPES.has(value);
}
function mapRepoError(err) {
    switch (err.code) {
        case 'NOT_FOUND':
            return { status: 404, code: 'NOT_FOUND', message: err.message };
        case 'CONFLICT':
            return { status: 409, code: 'CONFLICT', message: err.message };
    }
}
// ── list ──────────────────────────────────────────────────────
function listAddresses() {
    return repo.getAll();
}
function resolveProxy(input) {
    if (!input.proxyType || !input.proxyType.trim()) {
        return { ok: false, error: { status: 400, code: 'VALIDATION_ERROR', message: 'proxyType is required' } };
    }
    if (!input.proxyValue || !input.proxyValue.trim()) {
        return { ok: false, error: { status: 400, code: 'VALIDATION_ERROR', message: 'proxyValue is required' } };
    }
    const result = repo.getByProxy(input.proxyType.trim(), input.proxyValue.trim());
    if (!result.ok)
        return { ok: false, error: mapRepoError(result.error) };
    if (!result.value.active) {
        return {
            ok: false,
            error: { status: 404, code: 'NOT_FOUND', message: `Proxy ${input.proxyType}:${input.proxyValue} is inactive` },
        };
    }
    return { ok: true, value: result.value };
}
// ── get by id ─────────────────────────────────────────────────
function getAddress(id) {
    const result = repo.getById(id);
    if (!result.ok)
        return { ok: false, error: mapRepoError(result.error) };
    return { ok: true, value: result.value };
}
// ── get by participantId ──────────────────────────────────────
function getAddressByParticipant(participantId) {
    const result = repo.getByParticipantId(participantId);
    if (!result.ok)
        return { ok: false, error: mapRepoError(result.error) };
    return { ok: true, value: result.value };
}
const ALLOWED_PROXY_TYPES = ['email', 'phone', 'alias'];
const URL_RE = /^https?:\/\/.+/;
function registerAddress(input) {
    const errors = [];
    if (!input.participantId || !input.participantId.trim()) {
        errors.push('participantId is required');
    }
    if (!input.proxyType || !ALLOWED_PROXY_TYPES.includes(input.proxyType)) {
        errors.push(`proxyType must be one of: ${ALLOWED_PROXY_TYPES.join(', ')}`);
    }
    if (!input.proxyValue || !input.proxyValue.trim()) {
        errors.push('proxyValue is required');
    }
    if (!input.endpointUrl || !URL_RE.test(input.endpointUrl)) {
        errors.push('endpointUrl must be a valid http/https URL');
    }
    if (errors.length > 0) {
        return { ok: false, error: { status: 400, code: 'VALIDATION_ERROR', message: errors.join('; ') } };
    }
    const payload = {
        participantId: input.participantId.trim(),
        proxyType: input.proxyType.trim(),
        proxyValue: input.proxyValue.trim(),
        endpointUrl: input.endpointUrl.trim(),
    };
    const result = repo.create(payload);
    if (!result.ok)
        return { ok: false, error: mapRepoError(result.error) };
    return { ok: true, value: result.value };
}
function updateAddress(id, input) {
    if (input.endpointUrl !== undefined && !URL_RE.test(input.endpointUrl)) {
        return {
            ok: false,
            error: { status: 400, code: 'VALIDATION_ERROR', message: 'endpointUrl must be a valid http/https URL' },
        };
    }
    const payload = {};
    if (input.endpointUrl !== undefined)
        payload.endpointUrl = input.endpointUrl;
    if (input.active !== undefined)
        payload.active = input.active;
    const result = repo.update(id, payload);
    if (!result.ok)
        return { ok: false, error: mapRepoError(result.error) };
    return { ok: true, value: result.value };
}
// ── deregister ────────────────────────────────────────────────
function deregisterAddress(id) {
    const result = repo.remove(id);
    if (!result.ok)
        return { ok: false, error: mapRepoError(result.error) };
    return { ok: true, value: true };
}
//# sourceMappingURL=addressDirectory.js.map