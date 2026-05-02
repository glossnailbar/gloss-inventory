"use strict";
/**
 * Root Route - Landing page for API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexRouter = void 0;
const express_1 = require("express");
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
exports.indexRouter = router;
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
        const organization_id = req.query.org || 'cbe1d396-65f1-41ec-9c51-a471cfa836a1';
        const client = await pool_1.pool.connect();
        try {
            const products = await client.query('SELECT COUNT(*) as count FROM products WHERE organization_id = $1 AND deleted_at IS NULL', [organization_id]);
            const locations = await client.query('SELECT COUNT(*) as count FROM locations WHERE organization_id = $1 AND deleted_at IS NULL', [organization_id]);
            const inventory = await client.query('SELECT COUNT(*) as count FROM inventory_levels WHERE organization_id = $1 AND deleted_at IS NULL', [organization_id]);
            const sample = await client.query(`SELECT il.local_id, il.quantity_on_hand, p.local_id as product_local_id, p.name as product_name
         FROM inventory_levels il
         JOIN products p ON p.id = il.product_id
         WHERE il.organization_id = $1 AND il.deleted_at IS NULL
         LIMIT 10`, [organization_id]);
            res.json({
                organization_id,
                products: parseInt(products.rows[0].count),
                locations: parseInt(locations.rows[0].count),
                inventory_levels: parseInt(inventory.rows[0].count),
                sample_inventory_levels: sample.rows,
            });
        }
        finally {
            client.release();
        }
    }
    catch (err) {
        console.error('Diagnostic failed:', err);
        res.status(500).json({ error: 'Diagnostic failed' });
    }
});
//# sourceMappingURL=index.js.map