/**
 * Categories Routes
 */

import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

// GET /api/categories?org={org_id}
router.get('/', async (req, res) => {
  try {
    const organization_id = req.query.org as string;
    
    if (!organization_id) {
      return res.status(400).json({ error: 'organization_id required' });
    }
    
    const result = await pool.query(
      `SELECT * FROM categories 
       WHERE organization_id = $1 AND is_active = true AND deleted_at IS NULL
       ORDER BY name`,
      [organization_id]
    );
    
    res.json({ categories: result.rows });
  } catch (err) {
    console.error('Categories fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export { router as categoriesRouter };
