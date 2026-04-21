"use strict";
/**
 * PostgreSQL Connection Pool
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
// Use environment variable or fallback to Railway public URL
const connectionString = process.env.DATABASE_URL ||
    'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway';
const pool = new pg_1.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});
exports.pool = pool;
pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});
//# sourceMappingURL=pool.js.map