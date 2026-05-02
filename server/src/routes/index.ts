/**
 * Root Route - Landing page for API
 */

import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    name: 'Gloss Inventory API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      products: '/api/products',
      categories: '/api/categories',
      sync: '/api/sync/push',
    },
    documentation: 'https://github.com/glossnailbar/gloss-inventory',
  });
});

// Public diagnostic endpoint (no auth required)
router.get('/diagnostic', async (req, res) => {
  try {
    const organization_id = req.query.org as string || 'cbe1d396-65f1-41ec-9c51-a471cfa836a1';
    
    console.log('[Diagnostic] Request for org:', organization_id);
    
    const client = await pool.connect();
    
    try {
      console.log('[Diagnostic] Connected to DB');
      const products = await client.query('SELECT COUNT(*) as count FROM products WHERE organization_id = $1 AND deleted_at IS NULL', [organization_id]);
      console.log('[Diagnostic] Products query done');
      const locations = await client.query('SELECT COUNT(*) as count FROM locations WHERE organization_id = $1 AND deleted_at IS NULL', [organization_id]);
      console.log('[Diagnostic] Locations query done');
      const inventory = await client.query('SELECT COUNT(*) as count FROM inventory_levels WHERE organization_id = $1 AND deleted_at IS NULL', [organization_id]);
      console.log('[Diagnostic] Inventory query done');
      
      const sample = await client.query(
        `SELECT il.local_id, il.quantity_on_hand, p.local_id as product_local_id, p.name as product_name
         FROM inventory_levels il
         JOIN products p ON p.id = il.product_id
         WHERE il.organization_id = $1 AND il.deleted_at IS NULL
         LIMIT 10`,
        [organization_id]
      );
      console.log('[Diagnostic] Sample query done, rows:', sample.rows.length);
      
      res.json({
        organization_id,
        products: parseInt(products.rows[0].count),
        locations: parseInt(locations.rows[0].count),
        inventory_levels: parseInt(inventory.rows[0].count),
        sample_inventory_levels: sample.rows,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[Diagnostic] Error:', err.message);
    res.status(500).json({ error: 'Diagnostic failed', details: err.message });
  }
});

export { router as indexRouter };
