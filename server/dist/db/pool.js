"use strict";
/**
 * PostgreSQL Connection Pool
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
// Use DATABASE_PUBLIC_URL which has sslmode=no-verify
// Add uselibpqcompat=true for pg v8 compatibility with Railway proxy
const connectionString = (process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || '')
    .replace('?sslmode=no-verify', '?uselibpqcompat=true&sslmode=no-verify');
console.log('[Pool] Connecting to DB...');
// Let pg parse the connection string
const pool = new pg_1.Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
});
exports.pool = pool;
pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});
// Test connection on startup
pool.query('SELECT NOW()')
    .then(() => console.log('[Pool] ✅ DB connected'))
    .catch((err) => console.error('[Pool] ❌ DB connection failed:', err.message));
//# sourceMappingURL=pool.js.map