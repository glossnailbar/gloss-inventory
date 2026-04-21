"use strict";
/**
 * Gloss Inventory Server
 *
 * Express API for syncing IndexedDB data to PostgreSQL.
 * Deployed on Railway.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sync_1 = require("./routes/sync");
const products_1 = require("./routes/products");
const categories_1 = require("./routes/categories");
const auth_1 = __importDefault(require("./routes/auth"));
const index_1 = require("./routes/index");
const invitations_1 = __importDefault(require("./routes/invitations"));
dotenv_1.default.config();
// Run database migrations
async function runMigrations() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.log('No DATABASE_URL, skipping migrations');
        return;
    }
    const pool = new pg_1.Pool({ connectionString: dbUrl });
    try {
        console.log('Running database migrations...');
        const migrationFile = path_1.default.join(__dirname, '../migrations/000_init_schema.sql');
        const sql = fs_1.default.readFileSync(migrationFile, 'utf8');
        await pool.query(sql);
        console.log('✅ Migrations completed');
    }
    catch (err) {
        console.error('Migration error:', err.message);
    }
    finally {
        await pool.end();
    }
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)());
// CORS - allow multiple origins
const allowedOrigins = [
    'http://localhost:5173',
    'https://gloss-inventory.vercel.app',
    'https://gloss-inventory-*.vercel.app',
    'https://*.vercel.app',
    process.env.CLIENT_URL,
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        // Check if origin is allowed
        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed?.includes('*')) {
                // Handle wildcard patterns like https://gloss-inventory-*.vercel.app
                const pattern = allowed.replace(/\*/g, '.*?');
                return new RegExp(pattern).test(origin);
            }
            return allowed === origin || allowed === '*';
        });
        if (isAllowed) {
            callback(null, true);
        }
        else {
            console.log('CORS blocked:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
app.use('/', index_1.indexRouter);
app.use('/api/sync', sync_1.syncRouter);
app.use('/api/products', products_1.productsRouter);
app.use('/api/categories', categories_1.categoriesRouter);
app.use('/api/auth', auth_1.default);
app.use('/api/invitations', invitations_1.default);
// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Start server after migrations
async function startServer() {
    await runMigrations();
    app.listen(PORT, () => {
        console.log(`Gloss Inventory server running on port ${PORT}`);
    });
}
startServer();
//# sourceMappingURL=index.js.map