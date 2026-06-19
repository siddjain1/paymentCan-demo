// src/db/migrate.ts
// Runs all pending SQL migrations in filename order on startup.
// Tracks applied migrations in schema_migrations table.
// Throws on first failure — does not partially apply.

import * as fs from 'fs'
import * as path from 'path'
import { PoolClient } from 'pg'

const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

/**
 * Ensures the schema_migrations tracking table exists.
 */
async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}

/**
 * Returns the set of already-applied migration filenames.
 */
async function appliedMigrations(client: PoolClient): Promise<Set<string>> {
  const result = await client.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY filename'
  )
  return new Set(result.rows.map((r) => r.filename))
}

/**
 * Extracts the SQL between "-- up" and "-- down" markers.
 * If no "-- down" marker exists the entire file content after "-- up" is returned.
 */
export function extractUpBlock(sql: string): string {
  const upIdx = sql.indexOf('-- up')
  if (upIdx === -1) {
    throw new Error('Migration file missing "-- up" marker')
  }
  const afterUp = sql.slice(upIdx + '-- up'.length)
  const downIdx = afterUp.indexOf('-- down')
  const block = downIdx === -1 ? afterUp : afterUp.slice(0, downIdx)
  return block.trim()
}

/**
 * Extracts the SQL after the "-- down" marker.
 */
export function extractDownBlock(sql: string): string {
  const downIdx = sql.indexOf('-- down')
  if (downIdx === -1) {
    throw new Error('Migration file missing "-- down" marker')
  }
  return sql.slice(downIdx + '-- down'.length).trim()
}

/**
 * Runs all pending migrations in filename order.
 * Each migration is applied inside its own transaction so a failure
 * rolls back only the failing migration.
 */
export async function runMigrations(client: PoolClient): Promise<void> {
  await ensureMigrationsTable(client)
  const applied = await appliedMigrations(client)

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) {
      continue
    }

    const fullPath = path.join(MIGRATIONS_DIR, file)
    const sql = fs.readFileSync(fullPath, 'utf8')
    const upSql = extractUpBlock(sql)

    await client.query('BEGIN')
    try {
      await client.query(upSql)
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file]
      )
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw new Error(
        `Migration ${file} failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}
