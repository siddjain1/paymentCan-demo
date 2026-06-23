import { PoolClient } from 'pg';
/**
 * Extracts the SQL between "-- up" and "-- down" markers.
 * If no "-- down" marker exists the entire file content after "-- up" is returned.
 */
export declare function extractUpBlock(sql: string): string;
/**
 * Extracts the SQL after the "-- down" marker.
 */
export declare function extractDownBlock(sql: string): string;
/**
 * Runs all pending migrations in filename order.
 * Each migration is applied inside its own transaction so a failure
 * rolls back only the failing migration.
 */
export declare function runMigrations(client: PoolClient): Promise<void>;
//# sourceMappingURL=migrate.d.ts.map