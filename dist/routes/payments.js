"use strict";
// src/routes/payments.ts
// Express route handler for POST /r2p/payments.
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountPayments = mountPayments;
const paymentEngine_1 = require("../services/paymentEngine");
// ── POST /r2p/payments ────────────────────────────────────────
const submitPaymentHandler = (req, res, _next) => {
    const b = req.body;
    void (0, paymentEngine_1.submitPayment)({
        r2pId: String(b['r2pId'] ?? ''),
        paymentAmount: Number(b['paymentAmount']),
        currency: String(b['currency'] ?? ''),
        payerId: String(b['payerId'] ?? ''),
        payeeId: String(b['payeeId'] ?? ''),
    }).then((result) => {
        if (!result.ok) {
            const statusMap = {
                R2P_NOT_FOUND: 404,
                INVALID_STATE_TRANSITION: 409,
                AMOUNT_MISMATCH: 400,
            };
            res.status(statusMap[result.code] ?? 400).json({ code: result.code, message: result.message });
            return;
        }
        res.status(201).json({ paymentId: result.paymentId, r2pId: result.r2pId, status: result.status });
    });
};
// ── Mount ─────────────────────────────────────────────────────
function mountPayments(router) {
    router.post('/r2p/payments', submitPaymentHandler);
}
//# sourceMappingURL=payments.js.map