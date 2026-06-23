"use strict";
// src/tests/routes/r2pRequests.test.ts
// Integration-style tests for POST /r2p/requests route.
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
let postHandlers = [];
beforeAll(() => {
    const { router, routes } = makeRouter();
    (0, r2pRequests_1.mountR2PRequests)(router);
    const postRoute = routes.find((r) => r.method === 'POST' && r.path === '/r2p/requests');
    if (!postRoute)
        throw new Error('POST /r2p/requests route not registered');
    postHandlers = postRoute.handlers;
});
beforeEach(() => {
    (0, r2pRequest_1.resetStore)();
    (0, store_1.resetStore)();
});
// ── Valid body ────────────────────────────────────────────────
const validBody = {
    payerId: 'payer@banka.ca',
    payeeId: 'payee@bankb.ca',
    amount: 250.0,
    currency: 'CAD',
    dueDate: '2026-08-01',
    expiryTimestamp: '2026-08-01T23:59:59Z',
    remittanceInfo: 'Rent',
    idempotencyKey: 'route-idem-001',
};
// ── AC: 201 { r2pId, status: "created", createdAt } ─────────
describe('POST /r2p/requests — valid request', () => {
    it('returns 201 with r2pId, status=created, createdAt', () => {
        const req = { params: {}, query: {}, body: { ...validBody } };
        const res = makeRes();
        runHandlers(postHandlers, req, res);
        expect(res.statusCode).toBe(201);
        const body = res.body;
        expect(body.r2pId).toBeTruthy();
        expect(body.status).toBe('created');
        expect(typeof body.createdAt).toBe('string');
    });
});
// ── AC: 409 DUPLICATE_REQUEST ────────────────────────────────
describe('POST /r2p/requests — duplicate idempotencyKey', () => {
    it('returns 409 DUPLICATE_REQUEST on second call', () => {
        const req1 = { params: {}, query: {}, body: { ...validBody } };
        const req2 = { params: {}, query: {}, body: { ...validBody } };
        runHandlers(postHandlers, req1, makeRes());
        const res2 = makeRes();
        runHandlers(postHandlers, req2, res2);
        expect(res2.statusCode).toBe(409);
        const body = res2.body;
        expect(body.code).toBe('DUPLICATE_REQUEST');
    });
});
// ── AC: 400 VALIDATION_ERROR for invalid pain.013 payload ────
describe('POST /r2p/requests — invalid pain.013 payload', () => {
    it('returns 400 VALIDATION_ERROR when amount is missing', () => {
        const { amount: _omit, ...noAmount } = validBody;
        const req = { params: {}, query: {}, body: noAmount };
        const res = makeRes();
        runHandlers(postHandlers, req, res);
        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body.code).toBe('VALIDATION_ERROR');
        expect(Array.isArray(body.fields)).toBe(true);
        expect(body.fields.length).toBeGreaterThan(0);
    });
    it('returns 400 VALIDATION_ERROR when currency is wrong length', () => {
        const req = { params: {}, query: {}, body: { ...validBody, currency: 'CA', idempotencyKey: 'idem-currency' } };
        const res = makeRes();
        runHandlers(postHandlers, req, res);
        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body.code).toBe('VALIDATION_ERROR');
        const currencyError = body.fields.find((f) => f.field === 'currency');
        expect(currencyError).toBeDefined();
    });
    it('returns 400 VALIDATION_ERROR when payerId is missing', () => {
        const { payerId: _omit, ...noPayerId } = validBody;
        const req = { params: {}, query: {}, body: noPayerId };
        const res = makeRes();
        runHandlers(postHandlers, req, res);
        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body.code).toBe('VALIDATION_ERROR');
    });
    it('returns 400 VALIDATION_ERROR when dueDate is not a date', () => {
        const req = {
            params: {}, query: {},
            body: { ...validBody, dueDate: 'not-a-date', idempotencyKey: 'idem-date' }
        };
        const res = makeRes();
        runHandlers(postHandlers, req, res);
        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body.code).toBe('VALIDATION_ERROR');
    });
});
// ── AC: 404 PAYER_NOT_FOUND ───────────────────────────────────
describe('POST /r2p/requests — unknown payer proxy', () => {
    it('returns 404 PAYER_NOT_FOUND for unregistered payerId', () => {
        const req = {
            params: {}, query: {},
            body: { ...validBody, payerId: 'ghost@nowhere.ca', idempotencyKey: 'idem-ghost' }
        };
        const res = makeRes();
        runHandlers(postHandlers, req, res);
        expect(res.statusCode).toBe(404);
        const body = res.body;
        expect(body.code).toBe('PAYER_NOT_FOUND');
    });
});
//# sourceMappingURL=r2pRequests.test.js.map