/**
 * PostgreSQL Connection Pool
 */

import { Pool } from 'pg';

// Use DATABASE_PUBLIC_URL which has sslmode=no-verify
// Strip query params and handle SSL manually
const rawUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || '';
const connectionString = rawUrl ? rawUrl.split('?')[0] : '';

console.log('[Pool] Connecting to DB...');

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then(() => console.log('[Pool] ✅ DB connected'))
  .catch((err) => console.error('[Pool] ❌ DB connection failed:', err.message));

export { pool };
