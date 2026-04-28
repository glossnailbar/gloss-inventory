const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  // Check if there's a unique constraint on local_id + organization_id
  const result = await pool.query(`
    SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'products' AND schemaname = 'public'
  `);
  console.log('Products indexes:', result.rows);
  
  await pool.end();
}
check();
