"use strict";
/**
 * Products Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRouter = void 0;
const express_1 = require("express");
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
exports.productsRouter = router;
// GET /api/products?org={org_id}&page={page}&limit={limit}
router.get('/', async (req, res) => {
    try {
        const organization_id = req.query.org;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = (page - 1) * limit;
        if (!organization_id) {
            return res.status(400).json({ error: 'organization_id required' });
        }
        const result = await pool_1.pool.query(`SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.organization_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.updated_at DESC
       LIMIT $2 OFFSET $3`, [organization_id, limit, offset]);
        const countResult = await pool_1.pool.query('SELECT COUNT(*) FROM products WHERE organization_id = $1 AND deleted_at IS NULL', [organization_id]);
        res.json({
            products: result.rows,
            pagination: {
                page,
                limit,
                total: parseInt(countResult.rows[0].count),
                pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
            },
        });
    }
    catch (err) {
        console.error('Products fetch failed:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
//# sourceMappingURL=products.js.map