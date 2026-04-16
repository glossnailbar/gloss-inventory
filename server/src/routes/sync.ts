/**
 * Sync Routes
 * 
 * POST /api/sync/push - Push local changes to server
 * GET /api/sync/pull - Pull server changes since sequence
 */

import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticateToken } from './auth';

const router = Router();

// Apply auth middleware to all sync routes
router.use(authenticateToken);

// Validation schemas
const changeSchema = z.object({
  local_id: z.string(),
  table: z.enum(['products', 'inventory_transactions', 'purchase_orders', 'categories', 'vendors', 'locations', 'inventory_levels', 'item_activity']),
  operation: z.enum(['create', 'update', 'delete']),
  data: z.record(z.any()),
  client_timestamp: z.string(),
  client_version: z.number(),
});

const pushRequestSchema = z.object({
  device_id: z.string(),
  organization_id: z.string(),
  changes: z.array(changeSchema),
});

// POST /api/sync/push
router.post('/push', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { device_id, organization_id, changes } = pushRequestSchema.parse(req.body);
    
    await client.query('BEGIN');
    
    const accepted: any[] = [];
    const conflicts: any[] = [];
    const errors: any[] = [];
    
    for (const change of changes) {
      try {
        // Check for conflicts (server has newer version)
        const existingResult = await client.query(
          `SELECT sync_version, updated_at FROM ${change.table} WHERE local_id = $1`,
          [change.local_id]
        );
        
        if (existingResult.rows.length > 0) {
          const existing = existingResult.rows[0];
          const clientTime = new Date(change.client_timestamp);
          const serverTime = new Date(existing.updated_at);
          
          // Conflict if server version is newer
          if (existing.sync_version >= change.client_version && serverTime > clientTime) {
            conflicts.push({
              local_id: change.local_id,
              server_id: existing.id,
              table: change.table,
              server_data: existing,
              resolution: 'server_wins',
            });
            continue;
          }
        }
        
        // Apply the change
        let result;
        if (change.operation === 'create') {
          const columns = Object.keys(change.data);
          const values = Object.values(change.data);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          
          result = await client.query(
            `INSERT INTO ${change.table} (id, local_id, ${columns.join(', ')}, sync_version, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, ${placeholders}, $${values.length + 1}, NOW(), NOW())
             RETURNING id`,
            [change.local_id, ...values, change.client_version]
          );
        } else if (change.operation === 'update') {
          const updates = Object.keys(change.data).map((key, i) => `${key} = $${i + 3}`).join(', ');
          
          result = await client.query(
            `UPDATE ${change.table}
             SET ${updates}, sync_version = $${Object.keys(change.data).length + 3}, updated_at = NOW()
             WHERE local_id = $1 AND organization_id = $2
             RETURNING id`,
            [change.local_id, organization_id, ...Object.values(change.data), change.client_version]
          );
        } else if (change.operation === 'delete') {
          result = await client.query(
            `UPDATE ${change.table}
             SET deleted_at = NOW(), sync_version = $3, updated_at = NOW()
             WHERE local_id = $1 AND organization_id = $2
             RETURNING id`,
            [change.local_id, organization_id, change.client_version]
          );
        }
        
        accepted.push({
          local_id: change.local_id,
          server_id: result?.rows[0]?.id,
          table: change.table,
          status: change.operation + 'd',
        });
      } catch (err) {
        console.error('Sync error for change:', change.local_id, err);
        errors.push({
          local_id: change.local_id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
    
    // Get new server sequence
    const sequenceResult = await client.query(
      'SELECT nextval(\'sync_sequence\') as sequence'
    );
    
    await client.query('COMMIT');
    
    res.json({
      accepted,
      conflicts,
      errors,
      server_sequence: sequenceResult.rows[0].sequence,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Push failed:', err);
    res.status(500).json({ error: 'Sync failed' });
  } finally {
    client.release();
  }
});

// GET /api/sync/pull?since={sequence}&org={org_id}
router.get('/pull', async (req, res) => {
  try {
    const since = parseInt(req.query.since as string) || 0;
    const organization_id = req.query.org as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    
    if (!organization_id) {
      return res.status(400).json({ error: 'organization_id required' });
    }
    
    // Query for changes across all tables since sequence
    // This is a simplified version - production would use a proper changes table
    const result = await pool.query(`
      SELECT 'products' as table, id, local_id, sync_version as server_sequence, 
             name, sku, barcode, category_id, vendor_id, unit_of_measure,
             reorder_point, reorder_quantity, is_retail, is_backbar, 
             is_professional_only, image_url, deleted_at,
             'update' as operation
      FROM products 
      WHERE organization_id = $1 AND sync_version > $2
      
      UNION ALL
      
      SELECT 'inventory_transactions' as table, id, local_id, 
             sync_version as server_sequence,
             product_id, variant_id, location_id, transaction_type, 
             quantity, unit_cost, total_cost, reference_type, notes,
             deleted_at,
             'create' as operation
      FROM inventory_transactions
      WHERE organization_id = $1 AND sync_version > $2
      
      ORDER BY server_sequence
      LIMIT $3
    `, [organization_id, since, limit]);
    
    const changes = result.rows.map(row => ({
      table: row.table,
      operation: row.deleted_at ? 'delete' : row.operation,
      server_id: row.id,
      local_id: row.local_id,
      server_sequence: row.server_sequence,
      data: Object.fromEntries(
        Object.entries(row).filter(([key]) => 
          !['table', 'operation', 'id', 'local_id', 'server_sequence', 'deleted_at'].includes(key)
        )
      ),
    }));
    
    res.json({
      changes,
      has_more: changes.length === limit,
      new_sequence: changes.length > 0 
        ? Math.max(...changes.map(c => c.server_sequence)) 
        : since,
    });
  } catch (err) {
    console.error('Pull failed:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

export { router as syncRouter };
