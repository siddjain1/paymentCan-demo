"use strict";
// src/tests/db.test.ts
// Unit tests for 1.1 — Database Schema & Migrations
// Tests cover: migration SQL content, schema interfaces, seed data,
// migrate.ts logic, and acceptance criteria from spec 1.1.
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const migrate_1 = require("../db/migrate");
const seed_1 = require("../db/seed");
const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');
function readMigration(filename) {
    return fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
}
// ──────────────────────────────────────────────────────────
// Acceptance Criterion 1: All 8 migration files exist
// ──────────────────────────────────────────────────────────
describe('Migration files — existence', () => {
    const expectedFiles = [
        '001_create_r2p_request.sql',
        '002_create_r2p_state_transition.sql',
        '003_create_r2p_acknowledgement.sql',
        '004_create_r2p_response.sql',
        '005_create_r2p_payment.sql',
        '006_create_event_subscription.sql',
        '007_create_audit_store.sql',
        '008_create_outbox_event.sql',
    ];
    test.each(expectedFiles)('%s exists', (filename) => {
        const fullPath = path.join(MIGRATIONS_DIR, filename);
        expect(fs.existsSync(fullPath)).toBe(true);
    });
});
// ──────────────────────────────────────────────────────────
// Acceptance Criterion 2: Idempotent (IF NOT EXISTS) + reversible (-- down)
// ──────────────────────────────────────────────────────────
describe('Migration SQL — idempotency and reversibility', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    test.each(files)('%s has IF NOT EXISTS in up block', (file) => {
        const sql = readMigration(file);
        const up = (0, migrate_1.extractUpBlock)(sql);
        expect(up.toUpperCase()).toContain('IF NOT EXISTS');
    });
    test.each(files)('%s has a -- down block with DROP', (file) => {
        const sql = readMigration(file);
        const down = (0, migrate_1.extractDownBlock)(sql);
        expect(down.toUpperCase()).toContain('DROP');
        expect(down.length).toBeGreaterThan(0);
    });
});
// ──────────────────────────────────────────────────────────
// Acceptance Criterion 3: R2PRequest.version column
// ──────────────────────────────────────────────────────────
describe('R2PRequest — optimistic locking version column', () => {
    test('migration 001 defines version INTEGER NOT NULL DEFAULT 0', () => {
        const sql = readMigration('001_create_r2p_request.sql');
        const up = (0, migrate_1.extractUpBlock)(sql);
        expect(up).toMatch(/version\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
    });
    test('R2PRequestRow interface includes version as number', () => {
        // Compile-time check — instantiate a typed object
        const row = {
            id: 'uuid',
            idempotency_key: 'key',
            payer_id: 'payer',
            payee_id: 'payee',
            originating_participant_id: 'org',
            receiving_participant_id: 'rcv',
            amount: 100.00,
            currency: 'CAD',
            due_date: '2026-07-01',
            expiry_timestamp: '2026-07-01T00:00:00Z',
            remittance_info: null,
            status: 'created',
            version: 0,
            created_at: '2026-06-19T00:00:00Z',
            updated_at: '2026-06-19T00:00:00Z',
        };
        expect(typeof row.version).toBe('number');
        expect(row.version).toBe(0);
    });
});
// ──────────────────────────────────────────────────────────
// Acceptance Criterion 4: AuditStore trigger blocks UPDATE/DELETE
// ──────────────────────────────────────────────────────────
describe('AuditStore — immutability trigger', () => {
    test('migration 007 defines the trigger function', () => {
        const sql = readMigration('007_create_audit_store.sql');
        expect(sql).toContain('audit_store_immutable');
        expect(sql).toContain('RAISE EXCEPTION');
    });
    test('migration 007 creates the trigger on BEFORE UPDATE OR DELETE', () => {
        const sql = readMigration('007_create_audit_store.sql');
        expect(sql).toContain('BEFORE UPDATE OR DELETE ON "AuditStore"');
    });
    test('down block drops trigger and function before table', () => {
        const sql = readMigration('007_create_audit_store.sql');
        const down = (0, migrate_1.extractDownBlock)(sql);
        const triggerPos = down.indexOf('DROP TRIGGER');
        const funcPos = down.indexOf('DROP FUNCTION');
        const tablePos = down.indexOf('DROP TABLE');
        expect(triggerPos).toBeGreaterThanOrEqual(0);
        expect(funcPos).toBeGreaterThan(triggerPos);
        expect(tablePos).toBeGreaterThan(funcPos);
    });
});
// ──────────────────────────────────────────────────────────
// Acceptance Criterion 5: migrate.ts — extractUpBlock / extractDownBlock
// ──────────────────────────────────────────────────────────
describe('migrate.ts — block extraction', () => {
    const sampleSql = `-- up\nCREATE TABLE IF NOT EXISTS foo (id UUID PRIMARY KEY);\n\n-- down\nDROP TABLE IF EXISTS foo;`;
    test('extractUpBlock returns SQL between -- up and -- down', () => {
        const up = (0, migrate_1.extractUpBlock)(sampleSql);
        expect(up).toContain('CREATE TABLE');
        expect(up).not.toContain('DROP TABLE');
    });
    test('extractDownBlock returns SQL after -- down', () => {
        const down = (0, migrate_1.extractDownBlock)(sampleSql);
        expect(down).toContain('DROP TABLE');
        expect(down).not.toContain('CREATE TABLE');
    });
    test('extractUpBlock throws when -- up marker missing', () => {
        expect(() => (0, migrate_1.extractUpBlock)('no markers here')).toThrow();
    });
    test('extractDownBlock throws when -- down marker missing', () => {
        expect(() => (0, migrate_1.extractDownBlock)('no markers here')).toThrow();
    });
});
// ──────────────────────────────────────────────────────────
// Acceptance Criterion 5 continued: runMigrations skips applied ones
// ──────────────────────────────────────────────────────────
describe('runMigrations — behaviour with mock PoolClient', () => {
    function buildMockClient(appliedFilenames = []) {
        const queries = [];
        const mockClient = {
            query: jest.fn(async (sql, params) => {
                queries.push(typeof sql === 'string' ? sql.trim() : '');
                // Simulate the appliedMigrations SELECT
                if (typeof sql === 'string' && sql.includes('SELECT filename FROM schema_migrations')) {
                    return { rows: appliedFilenames.map((f) => ({ filename: f })) };
                }
                return { rows: [] };
            }),
            _queries: queries,
        };
        return mockClient;
    }
    test('creates schema_migrations table on first run', async () => {
        const client = buildMockClient();
        await (0, migrate_1.runMigrations)(client);
        const calls = client.query.mock.calls.map((c) => String(c[0]).trim());
        expect(calls.some((q) => q.includes('CREATE TABLE IF NOT EXISTS schema_migrations'))).toBe(true);
    });
    test('applies all 8 migrations when none are applied', async () => {
        const client = buildMockClient();
        await (0, migrate_1.runMigrations)(client);
        const insertCalls = client.query.mock.calls.filter((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO schema_migrations'));
        expect(insertCalls).toHaveLength(8);
    });
    test('skips already-applied migrations', async () => {
        const client = buildMockClient(['001_create_r2p_request.sql']);
        await (0, migrate_1.runMigrations)(client);
        const insertCalls = client.query.mock.calls.filter((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO schema_migrations'));
        // 7 remaining migrations should be inserted
        expect(insertCalls).toHaveLength(7);
    });
    test('wraps each migration in BEGIN/COMMIT', async () => {
        const client = buildMockClient();
        await (0, migrate_1.runMigrations)(client);
        const calls = client.query.mock.calls.map((c) => String(c[0]).trim());
        const begins = calls.filter((q) => q === 'BEGIN');
        const commits = calls.filter((q) => q === 'COMMIT');
        expect(begins).toHaveLength(8);
        expect(commits).toHaveLength(8);
    });
    test('rolls back and throws on migration failure', async () => {
        let callCount = 0;
        const mockClient = {
            query: jest.fn(async (sql) => {
                callCount++;
                if (typeof sql === 'string' && sql.includes('SELECT filename FROM schema_migrations')) {
                    return { rows: [] };
                }
                // Fail on the first actual migration SQL (after BEGIN)
                if (typeof sql === 'string' && sql.toUpperCase().startsWith('CREATE')) {
                    throw new Error('DB error');
                }
                return { rows: [] };
            }),
        };
        await expect((0, migrate_1.runMigrations)(mockClient)).rejects.toThrow('Migration');
        const rollbackCalls = mockClient.query.mock.calls.filter((c) => String(c[0]).trim() === 'ROLLBACK');
        expect(rollbackCalls).toHaveLength(1);
    });
});
// ──────────────────────────────────────────────────────────
// Acceptance Criterion 6: schema.ts exports typed interfaces for all tables
// ──────────────────────────────────────────────────────────
describe('schema.ts — typed interfaces', () => {
    test('R2PStateTransitionRow has from_status as string | null', () => {
        const row = {
            id: 'uuid',
            request_id: 'req-uuid',
            from_status: null,
            to_status: 'sent',
            actor: 'system',
            reason: null,
            transitioned_at: '2026-06-19T00:00:00Z',
        };
        expect(row.from_status).toBeNull();
    });
    test('OutboxEventRow status is a union type enforced at compile time', () => {
        const row = {
            id: 'uuid',
            event_type: 'r2p.created',
            entity_id: 'entity-id',
            participant_id: 'BANK_A',
            payload: '{}',
            status: 'pending',
            retry_count: 0,
            next_retry_at: null,
            created_at: '2026-06-19T00:00:00Z',
            delivered_at: null,
        };
        expect(['pending', 'delivered', 'failed']).toContain(row.status);
    });
    test('AuditStoreRow actor is string | null', () => {
        const row = {
            id: 'uuid',
            event_type: 'created',
            entity_type: 'R2PRequest',
            entity_id: 'req-id',
            actor: null,
            payload: '{}',
            occurred_at: '2026-06-19T00:00:00Z',
        };
        expect(row.actor).toBeNull();
    });
    test('R2PPaymentRow settled_at is string | null', () => {
        const row = {
            id: 'uuid',
            request_id: 'req-uuid',
            payment_reference: 'PAY-001',
            amount: 500.00,
            currency: 'CAD',
            settlement_status: 'pending',
            settled_at: null,
            created_at: '2026-06-19T00:00:00Z',
        };
        expect(row.settled_at).toBeNull();
    });
    test('EventSubscriptionRow active is boolean', () => {
        const row = {
            id: 'uuid',
            participant_id: 'BANK_A',
            proxy_type: 'email',
            proxy_value: 'payer@banka.ca',
            endpoint_url: 'http://localhost:4001',
            active: true,
            created_at: '2026-06-19T00:00:00Z',
        };
        expect(typeof row.active).toBe('boolean');
    });
    test('R2PResponseRow amount is number | null', () => {
        const row = {
            id: 'uuid',
            request_id: 'req-uuid',
            payer_id: 'payer',
            response_type: 'accept',
            reason: null,
            amount: null,
            responded_at: '2026-06-19T00:00:00Z',
        };
        expect(row.amount).toBeNull();
    });
    test('R2PAcknowledgementRow has all required fields', () => {
        const row = {
            id: 'uuid',
            request_id: 'req-uuid',
            participant_id: 'BANK_B',
            acknowledged_at: '2026-06-19T00:00:00Z',
        };
        expect(row.participant_id).toBe('BANK_B');
    });
});
// ──────────────────────────────────────────────────────────
// Acceptance Criterion 7: seed.ts — 5 test participants
// ──────────────────────────────────────────────────────────
describe('seed.ts — test participants', () => {
    test('TEST_PARTICIPANTS has exactly 5 entries', () => {
        expect(seed_1.TEST_PARTICIPANTS).toHaveLength(5);
    });
    test('all participant IDs match the spec', () => {
        const ids = seed_1.TEST_PARTICIPANTS.map((p) => p.participantId);
        expect(ids).toEqual(['BANK_A', 'BANK_B', 'BANK_C', 'BANK_D', 'BANK_E']);
    });
    test('BANK_A has email proxy and correct endpoint', () => {
        const p = seed_1.TEST_PARTICIPANTS[0];
        expect(p.proxyType).toBe('email');
        expect(p.proxyValue).toBe('payer@banka.ca');
        expect(p.endpointUrl).toBe('http://localhost:4001');
    });
    test('BANK_C has phone proxy', () => {
        const p = seed_1.TEST_PARTICIPANTS[2];
        expect(p.proxyType).toBe('phone');
        expect(p.proxyValue).toBe('+16135550001');
    });
    test('BANK_E has alias proxy', () => {
        const p = seed_1.TEST_PARTICIPANTS[4];
        expect(p.proxyType).toBe('alias');
        expect(p.proxyValue).toBe('corp-alias-1');
    });
    test('PARTICIPANT_MAP has 5 entries', () => {
        expect(seed_1.PARTICIPANT_MAP.size).toBe(5);
    });
    test('PARTICIPANT_MAP lookup by participantId works', () => {
        const bankB = seed_1.PARTICIPANT_MAP.get('BANK_B');
        expect(bankB).toBeDefined();
        expect(bankB?.endpointUrl).toBe('http://localhost:4002');
    });
    test('seedParticipants calls INSERT with ON CONFLICT DO NOTHING for each participant', async () => {
        const mockClient = {
            query: jest.fn(async () => ({ rows: [] })),
        };
        await (0, seed_1.seedParticipants)(mockClient);
        expect(mockClient.query).toHaveBeenCalledTimes(5);
        const calls = mockClient.query.mock.calls;
        calls.forEach((call) => {
            const sql = String(call[0]);
            expect(sql).toContain('ON CONFLICT');
            expect(sql).toContain('DO NOTHING');
        });
    });
});
// ──────────────────────────────────────────────────────────
// OutboxEvent SQL constraints
// ──────────────────────────────────────────────────────────
describe('OutboxEvent migration — delivery lifecycle columns', () => {
    test('migration 008 defines status with default pending', () => {
        const sql = readMigration('008_create_outbox_event.sql');
        const up = (0, migrate_1.extractUpBlock)(sql);
        expect(up).toMatch(/status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'pending'/i);
    });
    test('migration 008 defines retry_count INTEGER NOT NULL DEFAULT 0', () => {
        const sql = readMigration('008_create_outbox_event.sql');
        const up = (0, migrate_1.extractUpBlock)(sql);
        expect(up).toMatch(/retry_count\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
    });
    test('migration 008 defines next_retry_at TIMESTAMPTZ nullable', () => {
        const sql = readMigration('008_create_outbox_event.sql');
        const up = (0, migrate_1.extractUpBlock)(sql);
        expect(up).toMatch(/next_retry_at\s+TIMESTAMPTZ/i);
        // nullable means no NOT NULL constraint on that column
        const nextRetryLine = up.split('\n').find((l) => /next_retry_at/i.test(l)) ?? '';
        expect(nextRetryLine.toUpperCase()).not.toContain('NOT NULL');
    });
});
//# sourceMappingURL=db.test.js.map