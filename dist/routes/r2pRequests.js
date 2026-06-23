"use strict";
// src/routes/r2pRequests.ts
// Express router for POST /r2p/requests.
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountR2PRequests = mountR2PRequests;
const r2pRequest_1 = require("../services/r2pRequest");
const middleware_1 = require("../validators/middleware");
// ── Route handler ─────────────────────────────────────────────
const createRequestHandler = (req, res, _next) => {
    const b = req.body;
    const result = (0, r2pRequest_1.createRequest)({
        payerId: String(b['payerId'] ?? ''),
        payeeId: String(b['payeeId'] ?? ''),
        amount: Number(b['amount']),
        currency: String(b['currency'] ?? ''),
        dueDate: String(b['dueDate'] ?? ''),
        expiryTimestamp: String(b['expiryTimestamp'] ?? ''),
        remittanceInfo: b['remittanceInfo'] !== undefined ? String(b['remittanceInfo']) : undefined,
        idempotencyKey: String(b['idempotencyKey'] ?? ''),
    });
    if (!result.ok) {
        const status = result.code === 'DUPLICATE_REQUEST' ? 409 : 404;
        res.status(status).json({ code: result.code, message: result.message });
        return;
    }
    res.status(201).json({ r2pId: result.r2pId, status: result.status, createdAt: result.createdAt });
};
// ── PATCH /r2p/requests/:r2pId ────────────────────────────────
const modifyRequestHandler = (req, res, _next) => {
    const { r2pId } = req.params;
    const patch = req.body;
    const input = {};
    if ('amount' in patch)
        input.amount = patch['amount'];
    if ('dueDate' in patch)
        input.dueDate = patch['dueDate'];
    if ('expiryTimestamp' in patch)
        input.expiryTimestamp = patch['expiryTimestamp'];
    if ('remittanceInfo' in patch)
        input.remittanceInfo = patch['remittanceInfo'];
    const result = (0, r2pRequest_1.modifyRequest)(r2pId, input);
    if (!result.ok) {
        const statusMap = {
            NOT_FOUND: 404,
            INVALID_STATE_TRANSITION: 409,
            NO_FIELDS_TO_UPDATE: 400,
            VALIDATION_ERROR: 400,
        };
        res.status(statusMap[result.code] ?? 400).json({ code: result.code, message: result.message });
        return;
    }
    res.status(200).json({ r2pId: result.r2pId, status: result.status, updatedAt: result.updatedAt });
};
// ── DELETE /r2p/requests/:r2pId ──────────────────────────────
const cancelRequestHandler = (req, res, _next) => {
    const { r2pId } = req.params;
    const result = (0, r2pRequest_1.cancelRequest)(r2pId);
    if (!result.ok) {
        const statusMap = {
            NOT_FOUND: 404,
            INVALID_STATE_TRANSITION: 409,
        };
        res.status(statusMap[result.code] ?? 400).json({ code: result.code, message: result.message });
        return;
    }
    res.status(200).json({ r2pId: result.r2pId, status: result.status, cancelledAt: result.cancelledAt });
};
// ── POST /r2p/requests/:r2pId/acknowledge ─────────────────────
const acknowledgeRequestHandler = (req, res, _next) => {
    const { r2pId } = req.params;
    const b = req.body;
    const result = (0, r2pRequest_1.acknowledgeRequest)(r2pId, {
        participantId: String(b['participantId'] ?? ''),
        receivedAt: String(b['receivedAt'] ?? ''),
    });
    if (!result.ok) {
        const statusMap = {
            NOT_FOUND: 404,
            ALREADY_ACKNOWLEDGED: 409,
        };
        res.status(statusMap[result.code] ?? 400).json({ code: result.code, message: result.message });
        return;
    }
    res.status(200).json({ r2pId: result.r2pId, status: result.status });
};
// ── POST /r2p/requests/:r2pId/respond ────────────────────────
const respondToRequestHandler = (req, res, _next) => {
    const { r2pId } = req.params;
    const b = req.body;
    const respondInput = {
        responseType: String(b['responseType'] ?? ''),
        participantId: String(b['participantId'] ?? ''),
        respondedAt: String(b['respondedAt'] ?? ''),
    };
    if (b['amount'] !== undefined)
        respondInput.amount = Number(b['amount']);
    const result = (0, r2pRequest_1.respondToRequest)(r2pId, respondInput);
    if (!result.ok) {
        const statusMap = {
            NOT_FOUND: 404,
            INVALID_STATE_TRANSITION: 409,
            EXPIRED: 409,
            VALIDATION_ERROR: 400,
            AMOUNT_MISMATCH: 400,
        };
        res.status(statusMap[result.code] ?? 400).json({ code: result.code, message: result.message });
        return;
    }
    res.status(200).json({ r2pId: result.r2pId, status: result.status });
};
// ── Mount ─────────────────────────────────────────────────────
function mountR2PRequests(router) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.post('/r2p/requests', (0, middleware_1.validateISO20022)('pain.013'), createRequestHandler);
    router.patch('/r2p/requests/:r2pId', modifyRequestHandler);
    router.delete('/r2p/requests/:r2pId', cancelRequestHandler);
    router.post('/r2p/requests/:r2pId/acknowledge', acknowledgeRequestHandler);
    router.post('/r2p/requests/:r2pId/respond', respondToRequestHandler);
}
//# sourceMappingURL=r2pRequests.js.map