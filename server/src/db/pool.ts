/**
 * PostgreSQL Connection Pool
 */

import { Pool } from 'pg';

// Use environment variable or fallback to Railway public URL
const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

export { pool };
