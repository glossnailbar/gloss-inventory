"use strict";
/**
 * Categories Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesRouter = void 0;
const express_1 = require("express");
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
exports.categoriesRouter = router;
// GET /api/categories?org={org_id}
router.get('/', async (req, res) => {
    try {
        const organization_id = req.query.org;
        if (!organization_id) {
            return res.status(400).json({ error: 'organization_id required' });
        }
        const result = await pool_1.pool.query(`SELECT * FROM categories 
       WHERE organization_id = $1 AND is_active = true AND deleted_at IS NULL
       ORDER BY name`, [organization_id]);
        res.json({ categories: result.rows });
    }
    catch (err) {
        console.error('Categories fetch failed:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
//# sourceMappingURL=categories.js.map