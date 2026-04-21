"use strict";
/**
 * Root Route - Landing page for API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexRouter = void 0;
const express_1 = require("express");
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
//# sourceMappingURL=index.js.map