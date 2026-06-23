"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.closePool = closePool;
const pg_1 = require("pg");
let _pool = null;
function getPool(config) {
    if (!_pool) {
        _pool = new pg_1.Pool(config ?? {
            host: process.env['PGHOST'] ?? 'localhost',
            port: parseInt(process.env['PGPORT'] ?? '5432', 10),
            database: process.env['PGDATABASE'] ?? 'r2p',
            user: process.env['PGUSER'] ?? 'postgres',
            password: process.env['PGPASSWORD'] ?? '',
            max: parseInt(process.env['PGPOOL_MAX'] ?? '10', 10),
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
        _pool.on('error', (err) => {
            console.error('[pool] unexpected client error', err.message);
        });
    }
    return _pool;
}
async function closePool() {
    if (_pool) {
        await _pool.end();
        _pool = null;
    }
}
//# sourceMappingURL=pool.js.map