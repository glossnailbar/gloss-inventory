"use strict";
/**
 * PostgreSQL Connection Pool
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
// Use DATABASE_URL from Railway environment variables
// Railway provides DATABASE_URL which handles SSL internally
const connectionString = process.env.DATABASE_URL ||
    process.env.DATABASE_PUBLIC_URL ||
    'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway';
console.log('[Pool] Connecting to DB...');
// For Railway, use the standard SSL config that works with their proxy
const pool = new pg_1.Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false,
    } : false,
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
    .then((res) => console.log('[Pool] ✅ DB connected'))
    .catch((err) => console.error('[Pool] ❌ DB connection failed:', err.message));
//# sourceMappingURL=pool.js.map