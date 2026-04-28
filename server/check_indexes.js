const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const tables = ['products', 'categories', 'vendors', 'locations', 'inventory_levels'];
  for (const table of tables) {
    const result = await pool.query(`
      SELECT tablename, indexname, indexdef FROM pg_indexes WHERE tablename = '${table}' AND schemaname = 'public'
    `);
    console.log(table + ':', result.rows.map(r => r.indexname));
  }
  await pool.end();
}
check();
