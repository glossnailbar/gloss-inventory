/**
 * PostgreSQL Connection Pool
 */

import { Pool } from 'pg';

// Get connection string from Railway environment
const connectionString = process.env.DATABASE_URL || 
  process.env.DATABASE_PUBLIC_URL ||
  'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@glossinventorydb.up.railway.app:5432/railway';

// Log the host we're connecting to (for debugging)
const hostMatch = connectionString.match(/@([^:]+):/);
const dbHost = hostMatch ? hostMatch[1] : 'unknown';
console.log('[Pool] Connecting to DB host:', dbHost);

const pool = new Pool({
  connectionString,
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
