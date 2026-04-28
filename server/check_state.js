const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const orgId = 'cbe1d396-65f1-41ec-9c51-a471cfa836a1';
  
  const tables = ['products', 'locations', 'inventory_levels'];
  for (const table of tables) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM ' + table + ' WHERE organization_id = $1',
      [orgId]
    );
    console.log(table + ':', result.rows[0].count);
  }
  
  await pool.end();
}

check();
