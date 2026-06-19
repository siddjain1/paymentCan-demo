import { Pool, PoolConfig } from 'pg';

let _pool: Pool | null = null;

export function getPool(config?: PoolConfig): Pool {
  if (!_pool) {
    _pool = new Pool(
      config ?? {
        host:     process.env['PGHOST']     ?? 'localhost',
        port:     parseInt(process.env['PGPORT'] ?? '5432', 10),
        database: process.env['PGDATABASE'] ?? 'r2p',
        user:     process.env['PGUSER']     ?? 'postgres',
        password: process.env['PGPASSWORD'] ?? '',
        max:      parseInt(process.env['PGPOOL_MAX'] ?? '10', 10),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      }
    );

    _pool.on('error', (err: Error) => {
      console.error('[pool] unexpected client error', err.message);
    });
  }
  return _pool;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
