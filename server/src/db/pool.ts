/**
 * PostgreSQL Connection Pool
 * 
 * Railway connection notes:
 * - Railway provides DATABASE_URL with TCP proxy
 * - For Node.js pg library, use ssl: { rejectUnauthorized: false }
 * - Don't add query params to URL, configure SSL separately
 */

import { Pool } from 'pg';

// Get connection string from Railway environment (strip query params)
const rawUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
const connectionString = rawUrl ? rawUrl.split('?')[0] : 'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway';

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
