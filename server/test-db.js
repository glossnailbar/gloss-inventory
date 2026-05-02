import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway';

console.log('Testing connection...');
console.log('Connection string starts with:', connectionString.split('@')[0] + '@...');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

pool.query('SELECT NOW()')
  .then(res => {
    console.log('✅ Connected:', res.rows[0].now);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  });
