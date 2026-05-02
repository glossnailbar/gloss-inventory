"use strict";
/**
 * PostgreSQL Connection Pool
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
// Use DATABASE_PUBLIC_URL for Railway proxy (public network with SSL)
// Fallback to DATABASE_URL if public URL not available
const connectionString = process.env.DATABASE_PUBLIC_URL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway';
console.log('[Pool] Using connection:', connectionString.split('@')[1]?.split('/')[0] || 'unknown');
const pool = new pg_1.Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false, // Railway uses self-signed certs
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000, // 20s timeout for Railway proxy
});
exports.pool = pool;
pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});
// Test connection on startup
pool.query('SELECT NOW()')
    .then((res) => console.log('[Pool] DB connected:', res.rows[0].now))
    .catch((err) => console.error('[Pool] DB connection failed:', err.message));
//# sourceMappingURL=pool.js.map