/**
 * PostgreSQL Connection Pool
 */

import { Pool } from 'pg';

// Railway public TCP proxy requires SSL with SNI
// Use DATABASE_PUBLIC_URL with explicit SSL config
const rawUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || '';
const connectionString = rawUrl ? rawUrl.split('?')[0] : '';

console.log('[Pool] Connecting to DB...');

// Railway TCP proxy requires SSL but with specific SNI
const pool = new Pool({
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

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then(() => console.log('[Pool] ✅ DB connected'))
  .catch((err) => console.error('[Pool] ❌ DB connection failed:', err.message));

export { pool };
