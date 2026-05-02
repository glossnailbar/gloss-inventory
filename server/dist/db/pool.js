"use strict";
/**
 * PostgreSQL Connection Pool
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
// Railway public TCP proxy requires SSL with SNI
// Use DATABASE_PUBLIC_URL with explicit SSL config
const rawUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || '';
const connectionString = rawUrl ? rawUrl.split('?')[0] : '';
console.log('[Pool] Connecting to DB...');
// Railway TCP proxy requires SSL but with specific SNI
const pool = new pg_1.Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
        // Railway proxy needs SNI for routing
        servername: 'monorail.proxy.rlwy.net',
    },
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