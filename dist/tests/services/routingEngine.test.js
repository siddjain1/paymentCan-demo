"use strict";
// src/tests/services/routingEngine.test.ts
// Unit tests for dispatch() — tickets 3.1 and 3.2 ACs.
// HTTP client and sleep function mocked — no real network calls or waits.
Object.defineProperty(exports, "__esModule", { value: true });
const routingEngine_1 = require("../../services/routingEngine");
const r2pRequest_1 = require("../../services/r2pRequest");
const store_1 = require("../../db/store");
// ── Fixtures ──────────────────────────────────────────────────
const baseInput = {
    payerId: 'payer@banka.ca',
    payeeId: 'payee@bankb.ca',
    amount: 100.0,
    currency: 'CAD',
    dueDate: '2026-07-01',
    expiryTimestamp: '2026-07-01T23:59:59Z',
    remittanceInfo: 'Invoice #routing',
    idempotencyKey: 'idem-routing-001',
};
const TEST_ENDPOINT = 'http://localhost:4001';
const TEST_PAYLOAD = { r2pId: 'test-id', payerId: 'payer@banka.ca', payeeId: 'payee@bankb.ca', amount: 100, currency: 'CAD', dueDate: '2026-07-01' };
const noopSleep = async (_ms) => { };
function seedRequest(idempotencyKey = baseInput.idempotencyKey) {
    const result = (0, r2pRequest_1.createRequest)({ ...baseInput, idempotencyKey });
    if (!result.ok)
        throw new Error('Seed failed: ' + result.message);
    return result.r2pId;
}
function forceStatus(id, status) {
    const row = r2pRequest_1.r2pRepo.findById(id);
    r2pRequest_1.r2pRepo.update(id, { status, updated_at: new Date().toISOString() }, row.version);
}
beforeEach(() => {
    (0, r2pRequest_1.resetStore)();
    (0, store_1.resetStore)();
    (0, routingEngine_1.resetHttpClient)();
    (0, routingEngine_1.resetSleepFn)();
    (0, routingEngine_1.setSleepFn)(noopSleep); // skip all waits by default in tests
});
// ── 3.1 AC: status transitions created → sent ────────────────
describe('dispatch() — status transition created→sent', () => {
    it('transitions status from created to sent on dispatch', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 200 }));
        const id = seedRequest('t-sent-1');
        forceStatus(id, 'created');
        await (0, routingEngine_1.dispatch)(id, TEST_ENDPOINT, TEST_PAYLOAD);
        expect(r2pRequest_1.r2pRepo.findById(id)?.status).toBe('sent');
    });
    it('appends created→sent transition record', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 200 }));
        const id = seedRequest('t-sent-2');
        forceStatus(id, 'created');
        await (0, routingEngine_1.dispatch)(id, TEST_ENDPOINT, TEST_PAYLOAD);
        const t = r2pRequest_1.transitionRepo.list().filter((x) => x.r2p_id === id && x.to_status === 'sent');
        expect(t.length).toBeGreaterThanOrEqual(1);
        expect(t[t.length - 1].from_status).toBe('created');
        expect(t[t.length - 1].actor).toBe('routing-engine');
    });
});
// ── 3.1 AC: DELIVERY_ATTEMPT_1 audit recorded ────────────────
describe('dispatch() — DELIVERY_ATTEMPT_1 audit', () => {
    it('records DELIVERY_ATTEMPT_1 with endpoint on first call', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 200 }));
        const id = seedRequest('t-attempt-1');
        forceStatus(id, 'created');
        await (0, routingEngine_1.dispatch)(id, TEST_ENDPOINT, TEST_PAYLOAD);
        const attempts = r2pRequest_1.auditRepo.list().filter((a) => a.r2p_id === id && a.event_type === 'DELIVERY_ATTEMPT_1');
        expect(attempts.length).toBeGreaterThanOrEqual(1);
        expect(JSON.parse(attempts[0].detail).endpoint).toBe(TEST_ENDPOINT);
    });
});
// ── 3.1 AC: HTTP 2xx → delivered + DELIVERY_CONFIRMED ────────
describe('dispatch() — HTTP 2xx success', () => {
    it('returns { status: delivered } on 200', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 200 }));
        const result = await (0, routingEngine_1.dispatch)('any-id', TEST_ENDPOINT, TEST_PAYLOAD);
        expect(result.status).toBe('delivered');
        expect(result.statusCode).toBe(200);
    });
    it('returns { status: delivered } on 201', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 201 }));
        const result = await (0, routingEngine_1.dispatch)('any-id', TEST_ENDPOINT, TEST_PAYLOAD);
        expect(result.status).toBe('delivered');
    });
    it('records DELIVERY_CONFIRMED audit entry on 2xx', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 200 }));
        const id = seedRequest('t-confirmed');
        await (0, routingEngine_1.dispatch)(id, TEST_ENDPOINT, TEST_PAYLOAD);
        const confirmed = r2pRequest_1.auditRepo.list().filter((a) => a.r2p_id === id && a.event_type === 'DELIVERY_CONFIRMED');
        expect(confirmed.length).toBeGreaterThanOrEqual(1);
        expect(JSON.parse(confirmed[confirmed.length - 1].detail).statusCode).toBe(200);
    });
});
// ── 3.2 AC: retries up to 3 times on non-2xx ─────────────────
describe('dispatch() — retry on non-2xx', () => {
    it('makes exactly 4 attempts (1 initial + 3 retries) before failing', async () => {
        let callCount = 0;
        (0, routingEngine_1.setHttpClient)(async () => { callCount++; return { statusCode: 503 }; });
        await (0, routingEngine_1.dispatch)('any-id', TEST_ENDPOINT, TEST_PAYLOAD);
        expect(callCount).toBe(4);
    });
    it('records DELIVERY_ATTEMPT_1 through DELIVERY_ATTEMPT_4', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 500 }));
        const id = seedRequest('t-attempts-all');
        await (0, routingEngine_1.dispatch)(id, TEST_ENDPOINT, TEST_PAYLOAD);
        for (let n = 1; n <= 4; n++) {
            const entries = r2pRequest_1.auditRepo.list().filter((a) => a.r2p_id === id && a.event_type === `DELIVERY_ATTEMPT_${n}`);
            expect(entries.length).toBe(1);
        }
    });
    it('succeeds on retry 2 without exhausting all attempts', async () => {
        let callCount = 0;
        (0, routingEngine_1.setHttpClient)(async () => {
            callCount++;
            return { statusCode: callCount < 2 ? 503 : 200 };
        });
        const result = await (0, routingEngine_1.dispatch)('any-id', TEST_ENDPOINT, TEST_PAYLOAD);
        expect(result.status).toBe('delivered');
        expect(callCount).toBe(2);
    });
    it('returns { status: failed } after all 4 attempts non-2xx', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 500 }));
        const result = await (0, routingEngine_1.dispatch)('any-id', TEST_ENDPOINT, TEST_PAYLOAD);
        expect(result.status).toBe('failed');
        expect(result.statusCode).toBe(500);
    });
});
// ── 3.2 AC: retries on network error ─────────────────────────
describe('dispatch() — retry on network error', () => {
    it('makes exactly 4 attempts on repeated network errors', async () => {
        let callCount = 0;
        (0, routingEngine_1.setHttpClient)(async () => { callCount++; throw new Error('ECONNREFUSED'); });
        await (0, routingEngine_1.dispatch)('any-id', TEST_ENDPOINT, TEST_PAYLOAD);
        expect(callCount).toBe(4);
    });
    it('returns { status: failed } with error message after all retries', async () => {
        (0, routingEngine_1.setHttpClient)(async () => { throw new Error('ETIMEDOUT'); });
        const result = await (0, routingEngine_1.dispatch)('any-id', TEST_ENDPOINT, TEST_PAYLOAD);
        expect(result.status).toBe('failed');
        expect(result.error).toContain('ETIMEDOUT');
    });
});
// ── 3.2 AC: exponential backoff delays ───────────────────────
describe('dispatch() — exponential backoff', () => {
    it('calls sleep with 1000ms, 2000ms, 4000ms between retries', async () => {
        const sleepCalls = [];
        (0, routingEngine_1.setSleepFn)(async (ms) => { sleepCalls.push(ms); });
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 500 }));
        await (0, routingEngine_1.dispatch)('any-id', TEST_ENDPOINT, TEST_PAYLOAD);
        expect(sleepCalls).toEqual([1000, 2000, 4000]);
    });
    it('does not sleep before the first attempt', async () => {
        const sleepCalls = [];
        (0, routingEngine_1.setSleepFn)(async (ms) => { sleepCalls.push(ms); });
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 200 }));
        await (0, routingEngine_1.dispatch)('any-id', TEST_ENDPOINT, TEST_PAYLOAD);
        expect(sleepCalls).toHaveLength(0);
    });
    it('total backoff (1+2+4=7s) is under the 30s cap', () => {
        const delays = [1000, 2000, 4000];
        const total = delays.reduce((a, b) => a + b, 0);
        expect(total).toBeLessThan(30000);
    });
});
// ── 3.2 AC: status transitions to delivery_failed ────────────
describe('dispatch() — delivery_failed state', () => {
    it('transitions status to delivery_failed after exhaustion', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 500 }));
        const id = seedRequest('t-fail-status');
        forceStatus(id, 'sent');
        await (0, routingEngine_1.dispatch)(id, TEST_ENDPOINT, TEST_PAYLOAD);
        expect(r2pRequest_1.r2pRepo.findById(id)?.status).toBe('delivery_failed');
    });
    it('appends sent→delivery_failed transition record', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 500 }));
        const id = seedRequest('t-fail-transition');
        forceStatus(id, 'sent');
        await (0, routingEngine_1.dispatch)(id, TEST_ENDPOINT, TEST_PAYLOAD);
        const t = r2pRequest_1.transitionRepo.list().filter((x) => x.r2p_id === id && x.to_status === 'delivery_failed');
        expect(t).toHaveLength(1);
        expect(t[0].from_status).toBe('sent');
        expect(t[0].actor).toBe('routing-engine');
    });
});
// ── 3.2 AC: DELIVERY_EXHAUSTED audit ─────────────────────────
describe('dispatch() — DELIVERY_EXHAUSTED audit', () => {
    it('appends DELIVERY_EXHAUSTED after all retries exhausted', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 503 }));
        const id = seedRequest('t-exhausted');
        await (0, routingEngine_1.dispatch)(id, TEST_ENDPOINT, TEST_PAYLOAD);
        const exhausted = r2pRequest_1.auditRepo.list().filter((a) => a.r2p_id === id && a.event_type === 'DELIVERY_EXHAUSTED');
        expect(exhausted).toHaveLength(1);
        const detail = JSON.parse(exhausted[0].detail);
        expect(detail.attempts).toBe(4);
        expect(typeof detail.lastError).toBe('string');
    });
    it('does not append DELIVERY_EXHAUSTED on success', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 200 }));
        const id = seedRequest('t-no-exhausted');
        await (0, routingEngine_1.dispatch)(id, TEST_ENDPOINT, TEST_PAYLOAD);
        const exhausted = r2pRequest_1.auditRepo.list().filter((a) => a.r2p_id === id && a.event_type === 'DELIVERY_EXHAUSTED');
        expect(exhausted).toHaveLength(0);
    });
});
// ── 3.2 AC: ORIGINATOR_NOTIFIED stub ─────────────────────────
describe('dispatch() — ORIGINATOR_NOTIFIED', () => {
    it('appends ORIGINATOR_NOTIFIED after exhaustion', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 500 }));
        const id = seedRequest('t-notify');
        await (0, routingEngine_1.dispatch)(id, TEST_ENDPOINT, TEST_PAYLOAD);
        const notified = r2pRequest_1.auditRepo.list().filter((a) => a.r2p_id === id && a.event_type === 'ORIGINATOR_NOTIFIED');
        expect(notified).toHaveLength(1);
        expect(JSON.parse(notified[0].detail).reason).toBe('delivery_failed');
    });
    it('does not append ORIGINATOR_NOTIFIED on success', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 200 }));
        const id = seedRequest('t-no-notify');
        await (0, routingEngine_1.dispatch)(id, TEST_ENDPOINT, TEST_PAYLOAD);
        const notified = r2pRequest_1.auditRepo.list().filter((a) => a.r2p_id === id && a.event_type === 'ORIGINATOR_NOTIFIED');
        expect(notified).toHaveLength(0);
    });
});
// ── 3.1 AC: createRequest() triggers dispatch fire-and-forget ─
describe('createRequest() integration — dispatch is triggered', () => {
    it('records DELIVERY_ATTEMPT_1 after createRequest() resolves', async () => {
        (0, routingEngine_1.setHttpClient)(async () => ({ statusCode: 200 }));
        const result = (0, r2pRequest_1.createRequest)({ ...baseInput, idempotencyKey: 'idem-integration' });
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        await new Promise((r) => setTimeout(r, 20));
        const attempts = r2pRequest_1.auditRepo.list().filter((a) => a.r2p_id === result.r2pId && a.event_type === 'DELIVERY_ATTEMPT_1');
        expect(attempts.length).toBeGreaterThanOrEqual(1);
    });
    it('createRequest() returns created synchronously before dispatch settles', () => {
        (0, routingEngine_1.setHttpClient)(async () => {
            await new Promise((r) => setTimeout(r, 100));
            return { statusCode: 200 };
        });
        const result = (0, r2pRequest_1.createRequest)({ ...baseInput, idempotencyKey: 'idem-sync' });
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.status).toBe('created');
    });
});
//# sourceMappingURL=routingEngine.test.js.map