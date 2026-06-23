"use strict";
// src/tests/routes/modifyRequest.test.ts
// Integration-style tests for PATCH /r2p/requests/:r2pId route.
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
let patchHandlers = [];
const seedBody = {
    payerId: 'payer@banka.ca',
    payeeId: 'payee@bankb.ca',
    amount: 100.0,
    currency: 'CAD',
    dueDate: '2026-07-01',
    expiryTimestamp: '2026-07-01T23:59:59Z',
    remittanceInfo: 'Invoice #99',
    idempotencyKey: 'route-mod-001',
};
beforeAll(() => {
    const { router, routes } = makeRouter();
    (0, r2pRequests_1.mountR2PRequests)(router);
    const patchRoute = routes.find((r) => r.method === 'PATCH' && r.path === '/r2p/requests/:r2pId');
    if (!patchRoute)
        throw new Error('PATCH /r2p/requests/:r2pId route not registered');
    patchHandlers = patchRoute.handlers;
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
// ── AC: 200 { r2pId, status, updatedAt } on valid patch ───────
describe('PATCH /r2p/requests/:r2pId — valid patch', () => {
    it('returns 200 with r2pId, status, updatedAt when amount is changed', () => {
        const id = seedR2P();
        const req = { params: { r2pId: id }, query: {}, body: { amount: 250 } };
        const res = makeRes();
        runHandlers(patchHandlers, req, res);
        expect(res.statusCode).toBe(200);
        const body = res.body;
        expect(body.r2pId).toBe(id);
        expect(body.status).toBe('created');
        expect(typeof body.updatedAt).toBe('string');
    });
    it('returns 200 when dueDate is changed', () => {
        const id = seedR2P();
        const req = { params: { r2pId: id }, query: {}, body: { dueDate: '2026-12-31' } };
        const res = makeRes();
        runHandlers(patchHandlers, req, res);
        expect(res.statusCode).toBe(200);
    });
    it('returns 200 when expiryTimestamp is changed', () => {
        const id = seedR2P();
        const req = {
            params: { r2pId: id }, query: {},
            body: { expiryTimestamp: '2026-12-31T23:59:59Z' },
        };
        const res = makeRes();
        runHandlers(patchHandlers, req, res);
        expect(res.statusCode).toBe(200);
    });
    it('returns 200 when remittanceInfo is changed', () => {
        const id = seedR2P();
        const req = { params: { r2pId: id }, query: {}, body: { remittanceInfo: 'New note' } };
        const res = makeRes();
        runHandlers(patchHandlers, req, res);
        expect(res.statusCode).toBe(200);
    });
});
// ── AC: 404 NOT_FOUND for unknown r2pId ───────────────────────
describe('PATCH /r2p/requests/:r2pId — NOT_FOUND', () => {
    it('returns 404 NOT_FOUND for a non-existent r2pId', () => {
        const req = {
            params: { r2pId: '00000000-0000-7000-0000-000000000000' },
            query: {},
            body: { amount: 10 },
        };
        const res = makeRes();
        runHandlers(patchHandlers, req, res);
        expect(res.statusCode).toBe(404);
        const body = res.body;
        expect(body.code).toBe('NOT_FOUND');
    });
});
// ── AC: 409 INVALID_STATE_TRANSITION ─────────────────────────
describe('PATCH /r2p/requests/:r2pId — INVALID_STATE_TRANSITION', () => {
    it('returns 409 when request is in delivered state', () => {
        // Seed then manually override status via the service layer indirectly:
        // we cannot directly manipulate status from the route test, so we patch
        // using r2pRepo via a shared module — instead force via a sequence that
        // reaches a terminal state through multiple modifications then a direct
        // store manipulation via re-import
        const { r2pRepo } = require('../../services/r2pRequest');
        const id = seedR2P();
        const row = r2pRepo.findById(id);
        r2pRepo.update(id, { updated_at: new Date().toISOString(), status: 'delivered' }, row.version);
        const req = { params: { r2pId: id }, query: {}, body: { amount: 10 } };
        const res = makeRes();
        runHandlers(patchHandlers, req, res);
        expect(res.statusCode).toBe(409);
        const body = res.body;
        expect(body.code).toBe('INVALID_STATE_TRANSITION');
    });
});
// ── AC: 400 NO_FIELDS_TO_UPDATE for empty body ────────────────
describe('PATCH /r2p/requests/:r2pId — NO_FIELDS_TO_UPDATE', () => {
    it('returns 400 NO_FIELDS_TO_UPDATE for empty body', () => {
        const id = seedR2P();
        const req = { params: { r2pId: id }, query: {}, body: {} };
        const res = makeRes();
        runHandlers(patchHandlers, req, res);
        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body.code).toBe('NO_FIELDS_TO_UPDATE');
    });
});
// ── AC: 400 VALIDATION_ERROR for invalid field values ─────────
describe('PATCH /r2p/requests/:r2pId — VALIDATION_ERROR', () => {
    it('returns 400 VALIDATION_ERROR for negative amount', () => {
        const id = seedR2P();
        const req = { params: { r2pId: id }, query: {}, body: { amount: -5 } };
        const res = makeRes();
        runHandlers(patchHandlers, req, res);
        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body.code).toBe('VALIDATION_ERROR');
    });
    it('returns 400 VALIDATION_ERROR for bad dueDate format', () => {
        const id = seedR2P();
        const req = { params: { r2pId: id }, query: {}, body: { dueDate: '31-12-2026' } };
        const res = makeRes();
        runHandlers(patchHandlers, req, res);
        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body.code).toBe('VALIDATION_ERROR');
    });
    it('returns 400 VALIDATION_ERROR for expiryTimestamp without timezone', () => {
        const id = seedR2P();
        const req = {
            params: { r2pId: id }, query: {},
            body: { expiryTimestamp: '2026-12-31T23:59:59' },
        };
        const res = makeRes();
        runHandlers(patchHandlers, req, res);
        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body.code).toBe('VALIDATION_ERROR');
    });
});
//# sourceMappingURL=modifyRequest.test.js.map