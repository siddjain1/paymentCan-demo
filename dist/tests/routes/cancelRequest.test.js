"use strict";
// src/tests/routes/cancelRequest.test.ts
// Integration-style tests for DELETE /r2p/requests/:r2pId route.
// Uses mock req/res — no HTTP server required.
Object.defineProperty(exports, "__esModule", { value: true });
const r2pRequest_1 = require("../../services/r2pRequest");
const store_1 = require("../../db/store");
const r2pRequests_1 = require("../../routes/r2pRequests");
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
function makeRouter() {
    const routes = [];
    const router = {
        get: (path, ...handlers) => {
            routes.push({ method: 'GET', path, handlers });
        },
        post: (path, ...handlers) => {
            routes.push({ method: 'POST', path, handlers });
        },
        patch: (path, ...handlers) => {
            routes.push({ method: 'PATCH', path, handlers });
        },
        put: (path, ...handlers) => {
            routes.push({ method: 'PUT', path, handlers });
        },
        delete: (path, ...handlers) => {
            routes.push({ method: 'DELETE', path, handlers });
        },
    };
    return { router, routes };
}
// ── Execute middleware chain ──────────────────────────────────
function runHandlers(handlers, req, res) {
    let idx = 0;
    function next(err) {
        if (err || idx >= handlers.length)
            return;
        const handler = handlers[idx++];
        handler(req, res, next);
    }
    next();
    return res;
}
// ── Setup ─────────────────────────────────────────────────────
let deleteHandlers = [];
const seedBody = {
    payerId: 'payer@banka.ca',
    payeeId: 'payee@bankb.ca',
    amount: 100.0,
    currency: 'CAD',
    dueDate: '2026-07-01',
    expiryTimestamp: '2026-07-01T23:59:59Z',
    remittanceInfo: 'Invoice #99',
    idempotencyKey: 'route-cancel-001',
};
beforeAll(() => {
    const { router, routes } = makeRouter();
    (0, r2pRequests_1.mountR2PRequests)(router);
    const deleteRoute = routes.find((r) => r.method === 'DELETE' && r.path === '/r2p/requests/:r2pId');
    if (!deleteRoute)
        throw new Error('DELETE /r2p/requests/:r2pId route not registered');
    deleteHandlers = deleteRoute.handlers;
});
beforeEach(() => {
    (0, r2pRequest_1.resetStore)();
    (0, store_1.resetStore)();
});
function seedR2P() {
    const result = (0, r2pRequest_1.createRequest)(seedBody);
    if (!result.ok)
        throw new Error('Seed failed');
    return result.r2pId;
}
// ── AC: 200 { r2pId, status: "cancelled", cancelledAt } ──────
describe('DELETE /r2p/requests/:r2pId — valid cancel', () => {
    it('returns 200 with r2pId, status=cancelled, cancelledAt', () => {
        const id = seedR2P();
        const req = { params: { r2pId: id }, query: {}, body: {} };
        const res = makeRes();
        runHandlers(deleteHandlers, req, res);
        expect(res.statusCode).toBe(200);
        const body = res.body;
        expect(body.r2pId).toBe(id);
        expect(body.status).toBe('cancelled');
        expect(typeof body.cancelledAt).toBe('string');
    });
    it('cancels a request in sent state', () => {
        const id = seedR2P();
        const row = r2pRequest_1.r2pRepo.findById(id);
        r2pRequest_1.r2pRepo.update(id, { updated_at: new Date().toISOString(), status: 'sent' }, row.version);
        const req = { params: { r2pId: id }, query: {}, body: {} };
        const res = makeRes();
        runHandlers(deleteHandlers, req, res);
        expect(res.statusCode).toBe(200);
        const body = res.body;
        expect(body.status).toBe('cancelled');
    });
    it('cancels a request in delivered state', () => {
        const id = seedR2P();
        const row = r2pRequest_1.r2pRepo.findById(id);
        r2pRequest_1.r2pRepo.update(id, { updated_at: new Date().toISOString(), status: 'delivered' }, row.version);
        const req = { params: { r2pId: id }, query: {}, body: {} };
        const res = makeRes();
        runHandlers(deleteHandlers, req, res);
        expect(res.statusCode).toBe(200);
        const body = res.body;
        expect(body.status).toBe('cancelled');
    });
});
// ── AC: 404 NOT_FOUND for unknown r2pId ──────────────────────
describe('DELETE /r2p/requests/:r2pId — NOT_FOUND', () => {
    it('returns 404 NOT_FOUND for a non-existent r2pId', () => {
        const req = {
            params: { r2pId: '00000000-0000-7000-0000-000000000000' },
            query: {},
            body: {},
        };
        const res = makeRes();
        runHandlers(deleteHandlers, req, res);
        expect(res.statusCode).toBe(404);
        const body = res.body;
        expect(body.code).toBe('NOT_FOUND');
    });
});
// ── AC: 409 INVALID_STATE_TRANSITION for post-acceptance states ──
describe('DELETE /r2p/requests/:r2pId — INVALID_STATE_TRANSITION', () => {
    const blockedStates = ['accepted', 'payment_processing', 'paid', 'payment_failed', 'expired', 'cancelled'];
    blockedStates.forEach((state) => {
        it(`returns 409 when status is ${state}`, () => {
            const id = seedR2P();
            const row = r2pRequest_1.r2pRepo.findById(id);
            r2pRequest_1.r2pRepo.update(id, { updated_at: new Date().toISOString(), status: state }, row.version);
            const req = { params: { r2pId: id }, query: {}, body: {} };
            const res = makeRes();
            runHandlers(deleteHandlers, req, res);
            expect(res.statusCode).toBe(409);
            const body = res.body;
            expect(body.code).toBe('INVALID_STATE_TRANSITION');
        });
    });
});
//# sourceMappingURL=cancelRequest.test.js.map