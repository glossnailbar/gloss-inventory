const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const orgId = 'cbe1d396-65f1-41ec-9c51-a471cfa836a1';
  
  // Check product IDs
  const products = await pool.query(
    'SELECT id, local_id, name FROM products WHERE organization_id = $1 LIMIT 3',
    [orgId]
  );
  console.log('Products:');
  for (const p of products.rows) {
    console.log('  Server ID:', p.id);
    console.log('  Local ID:', p.local_id);
    console.log('  Name:', p.name);
    
    // Check inventory level for this product
    const inv = await pool.query(
      'SELECT id, local_id, product_id, quantity_on_hand FROM inventory_levels WHERE product_id = $1',
      [p.id]
    );
    console.log('  Inventory levels:', inv.rows);
    console.log('');
  }
  
  await pool.end();
}

check();
