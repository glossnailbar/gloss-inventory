const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway',
  ssl: { rejectUnauthorized: false }
});

async function clean() {
  const orgId = 'cbe1d396-65f1-41ec-9c51-a471cfa836a1';
  
  console.log('Cleaning server...');
  
  const tables = ['inventory_levels', 'products', 'categories', 'vendors', 'locations', 'sync_queue'];
  for (const table of tables) {
    const result = await pool.query(
      'DELETE FROM ' + table + ' WHERE organization_id = $1',
      [orgId]
    );
    console.log('Deleted from ' + table + ':', result.rowCount);
  }
  
  await pool.end();
  console.log('Server clean!');
}

clean();
