/**
 * Unit tests for src/db/migrate.ts and src/db/seed.ts.
 * No real database connection is used — PoolClient is fully mocked.
 */

import * as fs from 'fs'
import * as path from 'path'
import { runMigrations, extractUpBlock, extractDownBlock } from '../../db/migrate'
import { seedParticipants, TEST_PARTICIPANTS } from '../../db/seed'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type QueryMock = jest.MockedFunction<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>

function makeClient(initialApplied: string[] = []): { query: QueryMock } {
  const applied = new Set(initialApplied)

  const query: QueryMock = jest.fn(async (sql: string, params?: unknown[]) => {
    const trimmed = sql.trim()

    if (/SELECT filename FROM schema_migrations/i.test(trimmed)) {
      return { rows: [...applied].sort().map((f) => ({ filename: f })) }
    }

    if (/INSERT INTO schema_migrations/i.test(trimmed) && params) {
      applied.add(params[0] as string)
      return { rows: [] }
    }

    if (/INSERT INTO "EventSubscription"/i.test(trimmed)) {
      return { rows: [] }
    }

    return { rows: [] }
  })

  return { query }
}

// ---------------------------------------------------------------------------
// extractUpBlock / extractDownBlock unit tests
// ---------------------------------------------------------------------------

describe('extractUpBlock()', () => {
  it('extracts SQL between -- up and -- down', () => {
    const sql = `-- up\nCREATE TABLE foo (id UUID);\n-- down\nDROP TABLE foo;`
    expect(extractUpBlock(sql)).toBe('CREATE TABLE foo (id UUID);')
  })

  it('returns everything after -- up when no -- down marker', () => {
    const sql = `-- up\nCREATE TABLE foo (id UUID);`
    expect(extractUpBlock(sql)).toBe('CREATE TABLE foo (id UUID);')
  })

  it('throws when -- up marker is missing', () => {
    const sql = `CREATE TABLE foo (id UUID);`
    expect(() => extractUpBlock(sql)).toThrow('-- up')
  })
})

describe('extractDownBlock()', () => {
  it('extracts SQL after -- down marker', () => {
    const sql = `-- up\nCREATE TABLE foo (id UUID);\n-- down\nDROP TABLE foo;`
    expect(extractDownBlock(sql)).toBe('DROP TABLE foo;')
  })

  it('throws when -- down marker is missing', () => {
    const sql = `-- up\nCREATE TABLE foo (id UUID);`
    expect(() => extractDownBlock(sql)).toThrow('-- down')
  })
})

// ---------------------------------------------------------------------------
// SQL migration file integrity
// ---------------------------------------------------------------------------

describe('SQL migration files', () => {
  const migrationsDir = path.resolve(__dirname, '../../db/migrations')

  it('has exactly 8 migration files', () => {
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
    expect(files).toHaveLength(8)
  })

  it('files are numbered 001–008 with no gaps', () => {
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
    const prefixes = files.map((f) => f.slice(0, 3))
    expect(prefixes).toEqual(['001', '002', '003', '004', '005', '006', '007', '008'])
  })

  it('each file contains a -- up block', () => {
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'))
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      expect(content).toMatch(/--\s*up/i)
    }
  })

  it('each file contains a -- down block', () => {
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'))
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      expect(content).toMatch(/--\s*down/i)
    }
  })

  it('each up block contains CREATE TABLE IF NOT EXISTS', () => {
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'))
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      const upBlock = content.split(/--\s*down/i)[0]
      expect(upBlock).toMatch(/CREATE TABLE IF NOT EXISTS/i)
    }
  })

  it('R2PRequest migration includes version column for optimistic locking', () => {
    const content = fs.readFileSync(
      path.join(migrationsDir, '001_create_r2p_request.sql'),
      'utf8'
    )
    expect(content).toMatch(/version\s+INTEGER\s+NOT NULL\s+DEFAULT\s+0/i)
  })

  it('AuditStore migration includes immutability trigger', () => {
    const content = fs.readFileSync(
      path.join(migrationsDir, '007_create_audit_store.sql'),
      'utf8'
    )
    expect(content).toMatch(/audit_store_immutable/i)
    expect(content).toMatch(/BEFORE UPDATE OR DELETE/i)
  })

  it('OutboxEvent migration includes status, retry_count, next_retry_at', () => {
    const content = fs.readFileSync(
      path.join(migrationsDir, '008_create_outbox_event.sql'),
      'utf8'
    )
    expect(content).toMatch(/status/i)
    expect(content).toMatch(/retry_count/i)
    expect(content).toMatch(/next_retry_at/i)
  })
})

// ---------------------------------------------------------------------------
// runMigrations
// ---------------------------------------------------------------------------

describe('runMigrations()', () => {
  it('creates the schema_migrations table on first run', async () => {
    const client = makeClient()
    await runMigrations(client as never)

    const calls = (client.query as jest.Mock).mock.calls.map((c: unknown[]) =>
      (c[0] as string).trim()
    )
    const created = calls.some((sql) =>
      /CREATE TABLE IF NOT EXISTS schema_migrations/i.test(sql)
    )
    expect(created).toBe(true)
  })

  it('applies all 8 migrations when none are applied', async () => {
    const client = makeClient([])
    await runMigrations(client as never)

    const insertCalls = (client.query as jest.Mock).mock.calls.filter(
      (c: unknown[]) => /INSERT INTO schema_migrations/i.test(c[0] as string)
    )
    expect(insertCalls).toHaveLength(8)
  })

  it('skips already-applied migrations', async () => {
    const alreadyApplied = [
      '001_create_r2p_request.sql',
      '002_create_r2p_state_transition.sql',
    ]
    const client = makeClient(alreadyApplied)
    await runMigrations(client as never)

    const insertCalls = (client.query as jest.Mock).mock.calls.filter(
      (c: unknown[]) => /INSERT INTO schema_migrations/i.test(c[0] as string)
    )
    expect(insertCalls).toHaveLength(6)
  })

  it('does nothing when all migrations are already applied', async () => {
    const migrationsDir = path.resolve(__dirname, '../../db/migrations')
    const allFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
    const client = makeClient(allFiles)

    await runMigrations(client as never)

    const insertCalls = (client.query as jest.Mock).mock.calls.filter(
      (c: unknown[]) => /INSERT INTO schema_migrations/i.test(c[0] as string)
    )
    expect(insertCalls).toHaveLength(0)
  })

  it('wraps each migration in BEGIN / COMMIT', async () => {
    const client = makeClient([])
    await runMigrations(client as never)

    const sqls = (client.query as jest.Mock).mock.calls.map(
      (c: unknown[]) => (c[0] as string).trim().toUpperCase()
    )
    const beginCount = sqls.filter((s) => s === 'BEGIN').length
    const commitCount = sqls.filter((s) => s === 'COMMIT').length
    expect(beginCount).toBe(8)
    expect(commitCount).toBe(8)
  })
})

// ---------------------------------------------------------------------------
// TEST_PARTICIPANTS constant
// ---------------------------------------------------------------------------

describe('TEST_PARTICIPANTS', () => {
  it('has exactly 5 participants', () => {
    expect(TEST_PARTICIPANTS).toHaveLength(5)
  })

  it('includes BANK_A through BANK_E', () => {
    const ids = TEST_PARTICIPANTS.map((p) => p.participantId)
    expect(ids).toContain('BANK_A')
    expect(ids).toContain('BANK_B')
    expect(ids).toContain('BANK_C')
    expect(ids).toContain('BANK_D')
    expect(ids).toContain('BANK_E')
  })

  it('has valid proxy types', () => {
    const validTypes = new Set(['email', 'phone', 'alias'])
    for (const p of TEST_PARTICIPANTS) {
      expect(validTypes.has(p.proxyType)).toBe(true)
    }
  })

  it('all endpoint URLs point to localhost', () => {
    for (const p of TEST_PARTICIPANTS) {
      expect(p.endpointUrl).toMatch(/^http:\/\/localhost:\d+$/)
    }
  })
})

// ---------------------------------------------------------------------------
// seedParticipants
// ---------------------------------------------------------------------------

describe('seedParticipants()', () => {
  it('inserts one row per participant', async () => {
    const client = makeClient()
    await seedParticipants(client as never)

    const insertCalls = (client.query as jest.Mock).mock.calls.filter(
      (c: unknown[]) => /INSERT INTO "EventSubscription"/i.test(c[0] as string)
    )
    expect(insertCalls).toHaveLength(5)
  })

  it('is safe to call twice — does not throw', async () => {
    const client = makeClient()
    await seedParticipants(client as never)
    await expect(seedParticipants(client as never)).resolves.not.toThrow()
  })

  it('passes the correct participant data to each INSERT', async () => {
    const client = makeClient()
    await seedParticipants(client as never)

    const insertCalls = (client.query as jest.Mock).mock.calls.filter(
      (c: unknown[]) => /INSERT INTO "EventSubscription"/i.test(c[0] as string)
    )

    const participantIds = insertCalls.map((c: unknown[]) => (c[1] as unknown[])[1] as string)
    expect(participantIds).toContain('BANK_A')
    expect(participantIds).toContain('BANK_B')
    expect(participantIds).toContain('BANK_C')
    expect(participantIds).toContain('BANK_D')
    expect(participantIds).toContain('BANK_E')
  })
})
