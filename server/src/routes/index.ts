/**
 * Root Route - Landing page for API
 */

import { Router } from 'express';

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

export { router as indexRouter };
