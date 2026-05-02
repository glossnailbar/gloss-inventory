"use strict";
/**
 * PostgreSQL Connection Pool
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
// Use internal Railway URL if available, otherwise fall back to DATABASE_URL
// Internal URL avoids SSL issues between Railway services
const internalUrl = process.env.PGHOST && process.env.PGPORT && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE
    ? `postgresql://${process.env.PGUSER}:${encodeURIComponent(process.env.PGPASSWORD)}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`
    : null;
const connectionString = internalUrl || process.env.DATABASE_URL ||
    'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway';
const isInternal = !!internalUrl;
const pool = new pg_1.Pool({
    connectionString,
    ssl: isInternal ? false : { rejectUnauthorized: false },
});
exports.pool = pool;
pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});
//# sourceMappingURL=pool.js.map