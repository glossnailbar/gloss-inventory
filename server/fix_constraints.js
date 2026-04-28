const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const tables = ['products', 'categories', 'vendors', 'locations', 'inventory_levels'];
  
  for (const table of tables) {
    try {
      // Check if the composite unique constraint exists
      const checkResult = await pool.query(`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = '${table}' 
        AND indexdef LIKE '%(local_id, organization_id)%'
      `);
      
      if (checkResult.rows.length === 0) {
        // Add unique constraint on (local_id, organization_id)
        await pool.query(`
          ALTER TABLE ${table} 
          ADD CONSTRAINT ${table}_local_id_org_unique 
          UNIQUE (local_id, organization_id)
        `);
        console.log(`Added unique constraint on ${table}(local_id, organization_id)`);
      } else {
        console.log(`${table} already has unique constraint on (local_id, organization_id)`);
      }
    } catch (e) {
      console.log(`Error on ${table}:`, e.message);
    }
  }
  
  await pool.end();
}

fix();
