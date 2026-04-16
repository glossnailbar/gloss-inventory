/**
 * Gloss Inventory Server
 * 
 * Express API for syncing IndexedDB data to PostgreSQL.
 * Deployed on Railway.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

import { syncRouter } from './routes/sync';
import { productsRouter } from './routes/products';
import { categoriesRouter } from './routes/categories';
import authRouter from './routes/auth';
import { indexRouter } from './routes/index';

dotenv.config();

// Run database migrations
async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('No DATABASE_URL, skipping migrations');
    return;
  }

  const pool = new Pool({ connectionString: dbUrl });
  
  try {
    console.log('Running database migrations...');
    const migrationFile = path.join(__dirname, '../migrations/000_init_schema.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    await pool.query(sql);
    console.log('✅ Migrations completed');
  } catch (err: any) {
    console.error('Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS - allow multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://gloss-inventory.vercel.app',
  'https://gloss-inventory-*.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
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
    } else {
      console.log('CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/', indexRouter);
app.use('/api/sync', syncRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/auth', authRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
