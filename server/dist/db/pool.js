"use strict";
/**
 * PostgreSQL Connection Pool
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
// Use internal Railway URL if available (no SSL needed within Railway network)
// Otherwise use DATABASE_PUBLIC_URL with SSL
let connectionString;
let sslConfig = false;
if (process.env.PGHOST && process.env.PGPORT && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
    // We're inside Railway network, use internal connection (no SSL)
    connectionString = `postgresql://${process.env.PGUSER}:${encodeURIComponent(process.env.PGPASSWORD)}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
    console.log('[Pool] Using internal Railway connection (no SSL)');
}
else if (process.env.DATABASE_PUBLIC_URL) {
    // Use public URL with SSL
    connectionString = process.env.DATABASE_PUBLIC_URL;
    sslConfig = { rejectUnauthorized: false };
    console.log('[Pool] Using public Railway connection (with SSL)');
}
else {
    // Fallback
    connectionString = process.env.DATABASE_URL ||
        'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway';
    sslConfig = { rejectUnauthorized: false };
    console.log('[Pool] Using fallback connection string');
}
console.log('[Pool] Connection string starts with:', connectionString.substring(0, 20) + '...');
const pool = new pg_1.Pool({
    connectionString,
    ssl: sslConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});
exports.pool = pool;
pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});
// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('[Pool] Initial connection test failed:', err.message);
    }
    else {
        console.log('[Pool] Initial connection test successful:', res.rows[0].now);
    }
});
//# sourceMappingURL=pool.js.map