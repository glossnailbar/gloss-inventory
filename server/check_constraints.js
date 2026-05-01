const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway',
  ssl: false
});

async function check() {
  const tables = ['products', 'categories', 'vendors', 'locations', 'inventory_levels'];
  for (const table of tables) {
    try {
      const result = await pool.query(`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = '${table}' 
        AND schemaname = 'public'
        AND indexdef LIKE '%UNIQUE%'
      `);
      console.log(table + ' UNIQUE constraints:', result.rows.map(r => r.indexname));
    } catch (e) {
      console.log(table + ': error -', e.message);
    }
  }
  await pool.end();
}

check();
