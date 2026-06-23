"use strict";
// src/db/migrate.ts
// Runs all pending SQL migrations in filename order on startup.
// Tracks applied migrations in schema_migrations table.
// Throws on first failure — does not partially apply.
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
exports.extractUpBlock = extractUpBlock;
exports.extractDownBlock = extractDownBlock;
exports.runMigrations = runMigrations;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
/**
 * Ensures the schema_migrations tracking table exists.
 */
async function ensureMigrationsTable(client) {
    await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}
/**
 * Returns the set of already-applied migration filenames.
 */
async function appliedMigrations(client) {
    const result = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
    return new Set(result.rows.map((r) => r.filename));
}
/**
 * Extracts the SQL between "-- up" and "-- down" markers.
 * If no "-- down" marker exists the entire file content after "-- up" is returned.
 */
function extractUpBlock(sql) {
    const upIdx = sql.indexOf('-- up');
    if (upIdx === -1) {
        throw new Error('Migration file missing "-- up" marker');
    }
    const afterUp = sql.slice(upIdx + '-- up'.length);
    const downIdx = afterUp.indexOf('-- down');
    const block = downIdx === -1 ? afterUp : afterUp.slice(0, downIdx);
    return block.trim();
}
/**
 * Extracts the SQL after the "-- down" marker.
 */
function extractDownBlock(sql) {
    const downIdx = sql.indexOf('-- down');
    if (downIdx === -1) {
        throw new Error('Migration file missing "-- down" marker');
    }
    return sql.slice(downIdx + '-- down'.length).trim();
}
/**
 * Runs all pending migrations in filename order.
 * Each migration is applied inside its own transaction so a failure
 * rolls back only the failing migration.
 */
async function runMigrations(client) {
    await ensureMigrationsTable(client);
    const applied = await appliedMigrations(client);
    const files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();
    for (const file of files) {
        if (applied.has(file)) {
            continue;
        }
        const fullPath = path.join(MIGRATIONS_DIR, file);
        const sql = fs.readFileSync(fullPath, 'utf8');
        const upSql = extractUpBlock(sql);
        await client.query('BEGIN');
        try {
            await client.query(upSql);
            await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
            await client.query('COMMIT');
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw new Error(`Migration ${file} failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}
//# sourceMappingURL=migrate.js.map