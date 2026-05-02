/**
 * PostgreSQL Connection Pool
 */

import { Pool } from 'pg';

// Railway provides DATABASE_URL for internal connections
// and DATABASE_PUBLIC_URL for external connections
// Use DATABASE_URL first (internal Railway network)
const connectionString = process.env.DATABASE_URL || 
  process.env.DATABASE_PUBLIC_URL ||
  'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway';

console.log('[Pool] Connecting to DB...');

// Parse connection string to check for sslmode
const hasSslMode = connectionString.includes('sslmode=');

const pool = new Pool({
  connectionString,
  ssl: hasSslMode ? undefined : {
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
