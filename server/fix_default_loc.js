const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const orgId = 'cbe1d396-65f1-41ec-9c51-a471cfa836a1';
  
  // Update the default location to have local_id = 'default'
  await pool.query(
    'UPDATE locations SET local_id = $1 WHERE organization_id = $2 AND name = $3',
    ['default', orgId, 'Default Location']
  );
  console.log('Updated default location local_id to "default"');
  
  // Verify
  const locs = await pool.query('SELECT id, local_id, name FROM locations WHERE organization_id = $1', [orgId]);
  console.log('All locations:', locs.rows);
  
  await pool.end();
}

fix();
