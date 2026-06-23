"use strict";
// src/routes/addressDirectory.ts
// Express router for Address Directory endpoints.
// Uses inline Express-compatible types (mirrors pattern in src/validators/middleware.ts).
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
exports.internalResolveHandler = void 0;
exports.mountAddressDirectory = mountAddressDirectory;
const svc = __importStar(require("../services/addressDirectory"));
const addressDirectory_1 = require("../services/addressDirectory");
// ── helpers ───────────────────────────────────────────────────
function sendError(res, err) {
    return res.status(err.status).json({ code: err.code, message: err.message });
}
function body(req) {
    return (req.body ?? {});
}
// ── handlers ──────────────────────────────────────────────────
/** GET /addresses — list all registered addresses */
const listAddresses = (_req, res, _next) => {
    res.status(200).json(svc.listAddresses());
};
/** GET /addresses/resolve?proxyType=email&proxyValue=foo@bar.ca */
const resolveProxy = (req, res, _next) => {
    const proxyType = String(req.query['proxyType'] ?? '');
    const proxyValue = String(req.query['proxyValue'] ?? '');
    const result = svc.resolveProxy({ proxyType, proxyValue });
    if (!result.ok)
        return sendError(res, result.error);
    res.status(200).json(result.value);
};
/** GET /addresses/:id */
const getAddress = (req, res, _next) => {
    const result = svc.getAddress(req.params['id'] ?? '');
    if (!result.ok)
        return sendError(res, result.error);
    res.status(200).json(result.value);
};
/** GET /addresses/participant/:participantId */
const getByParticipant = (req, res, _next) => {
    const result = svc.getAddressByParticipant(req.params['participantId'] ?? '');
    if (!result.ok)
        return sendError(res, result.error);
    res.status(200).json(result.value);
};
/** POST /addresses — register a new address */
const registerAddress = (req, res, _next) => {
    const b = body(req);
    const result = svc.registerAddress({
        participantId: String(b['participantId'] ?? ''),
        proxyType: String(b['proxyType'] ?? ''),
        proxyValue: String(b['proxyValue'] ?? ''),
        endpointUrl: String(b['endpointUrl'] ?? ''),
    });
    if (!result.ok)
        return sendError(res, result.error);
    res.status(201).json(result.value);
};
/** PUT /addresses/:id — update endpointUrl and/or active flag */
const updateAddress = (req, res, _next) => {
    const b = body(req);
    const input = {};
    if (b['endpointUrl'] !== undefined)
        input.endpointUrl = String(b['endpointUrl']);
    if (b['active'] !== undefined)
        input.active = Boolean(b['active']);
    const result = svc.updateAddress(req.params['id'] ?? '', input);
    if (!result.ok)
        return sendError(res, result.error);
    res.status(200).json(result.value);
};
/** DELETE /addresses/:id — deregister an address */
const deregisterAddress = (req, res, _next) => {
    const result = svc.deregisterAddress(req.params['id'] ?? '');
    if (!result.ok)
        return sendError(res, result.error);
    res.status(204).json({});
};
// ── Spec-required internal route (ticket 1.3) ─────────────────
// GET /internal/address-directory/resolve?proxyType=X&proxyValue=Y
// Error codes match the spec: INVALID_PROXY_TYPE, PARTICIPANT_NOT_FOUND
const internalResolveHandler = (req, res, _next) => {
    const proxyTypeRaw = req.query['proxyType'];
    const proxyValueRaw = req.query['proxyValue'];
    // 400 — missing params
    if (!proxyTypeRaw) {
        res.status(400).json({ code: 'INVALID_PROXY_TYPE', message: 'proxyType must be one of: email, phone, alias' });
        return;
    }
    if (!proxyValueRaw) {
        res.status(400).json({ code: 'MISSING_PARAM', message: 'proxyValue is required' });
        return;
    }
    const proxyType = String(proxyTypeRaw);
    const proxyValue = String(proxyValueRaw);
    // 400 — invalid proxy type
    if (!(0, addressDirectory_1.isValidProxyType)(proxyType)) {
        res.status(400).json({ code: 'INVALID_PROXY_TYPE', message: 'proxyType must be one of: email, phone, alias' });
        return;
    }
    // resolve
    const address = svc.resolve(proxyType, proxyValue);
    if (!address) {
        res.status(404).json({ code: 'PARTICIPANT_NOT_FOUND', message: 'No participant found for given proxy' });
        return;
    }
    res.status(200).json(address);
};
exports.internalResolveHandler = internalResolveHandler;
// ── mount ─────────────────────────────────────────────────────
function mountAddressDirectory(router) {
    // Internal spec-required route
    router.get('/internal/address-directory/resolve', exports.internalResolveHandler);
    // Order matters: /resolve and /participant/:id before /:id to avoid param capture
    router.get('/addresses/resolve', resolveProxy);
    router.get('/addresses/participant/:participantId', getByParticipant);
    router.get('/addresses/:id', getAddress);
    router.get('/addresses', listAddresses);
    router.post('/addresses', registerAddress);
    router.put('/addresses/:id', updateAddress);
    router.delete('/addresses/:id', deregisterAddress);
}
//# sourceMappingURL=addressDirectory.js.map