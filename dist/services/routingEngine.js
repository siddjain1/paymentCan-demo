"use strict";
// src/services/routingEngine.ts
// Internal routing engine: delivers R2P requests to participant endpoints via HTTP POST.
// HTTP client and sleep function are injectable for testability.
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
exports.setHttpClient = setHttpClient;
exports.resetHttpClient = resetHttpClient;
exports.setSleepFn = setSleepFn;
exports.resetSleepFn = resetSleepFn;
exports.dispatch = dispatch;
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const r2pRequest_1 = require("./r2pRequest");
// ── Constants ─────────────────────────────────────────────────
const MAX_ATTEMPTS = 4; // 1 initial + 3 retries
const BASE_DELAY_MS = 1000; // delays: 1s, 2s, 4s → max 7s total
// ── Default HTTP client ───────────────────────────────────────
function defaultHttpClient(url, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const options = {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname || '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
            },
        };
        const req = lib.request(options, (res) => {
            resolve({ statusCode: res.statusCode ?? 0 });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}
// ── Injectable client and sleep ───────────────────────────────
let httpClient = defaultHttpClient;
let sleepFn = (ms) => new Promise((r) => setTimeout(r, ms));
function setHttpClient(client) { httpClient = client; }
function resetHttpClient() { httpClient = defaultHttpClient; }
function setSleepFn(fn) { sleepFn = fn; }
function resetSleepFn() { sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)); }
// ── dispatch ──────────────────────────────────────────────────
async function dispatch(r2pId, endpoint, payload) {
    const now = new Date().toISOString();
    // 1. Transition created → sent
    const current = r2pRequest_1.r2pRepo.findById(r2pId);
    if (current && current.status === 'created') {
        r2pRequest_1.r2pRepo.update(r2pId, { status: 'sent', updated_at: now }, current.version);
        r2pRequest_1.transitionRepo.append({
            r2p_id: r2pId,
            from_status: 'created',
            to_status: 'sent',
            actor: 'routing-engine',
        });
    }
    // 2. Retry loop with exponential backoff
    let lastError;
    let lastStatusCode;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) {
            await sleepFn(BASE_DELAY_MS * 2 ** (attempt - 1));
        }
        r2pRequest_1.auditRepo.append({
            r2p_id: r2pId,
            event_type: `DELIVERY_ATTEMPT_${attempt + 1}`,
            actor: 'routing-engine',
            detail: JSON.stringify({ endpoint, attempt: attempt + 1 }),
        });
        try {
            const response = await httpClient(endpoint, payload);
            const is2xx = response.statusCode >= 200 && response.statusCode < 300;
            if (is2xx) {
                r2pRequest_1.auditRepo.append({
                    r2p_id: r2pId,
                    event_type: 'DELIVERY_CONFIRMED',
                    actor: 'routing-engine',
                    detail: JSON.stringify({ statusCode: response.statusCode, attempt: attempt + 1 }),
                });
                return { status: 'delivered', statusCode: response.statusCode };
            }
            lastStatusCode = response.statusCode;
            lastError = `HTTP ${response.statusCode}`;
        }
        catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
        }
    }
    // 3. All attempts exhausted — mark delivery_failed
    const exhaustedAt = new Date().toISOString();
    const sentRow = r2pRequest_1.r2pRepo.findById(r2pId);
    if (sentRow && sentRow.status === 'sent') {
        r2pRequest_1.r2pRepo.update(r2pId, { status: 'delivery_failed', updated_at: exhaustedAt }, sentRow.version);
        r2pRequest_1.transitionRepo.append({
            r2p_id: r2pId,
            from_status: 'sent',
            to_status: 'delivery_failed',
            actor: 'routing-engine',
        });
    }
    r2pRequest_1.auditRepo.append({
        r2p_id: r2pId,
        event_type: 'DELIVERY_EXHAUSTED',
        actor: 'routing-engine',
        detail: JSON.stringify({ attempts: MAX_ATTEMPTS, lastError }),
    });
    // Stub: real notification delivered via Event Publisher (ticket 6.5)
    r2pRequest_1.auditRepo.append({
        r2p_id: r2pId,
        event_type: 'ORIGINATOR_NOTIFIED',
        actor: 'routing-engine',
        detail: JSON.stringify({ reason: 'delivery_failed' }),
    });
    return { status: 'failed', error: lastError, statusCode: lastStatusCode };
}
//# sourceMappingURL=routingEngine.js.map