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
  table: z.enum(['products', 'categories', 'vendors', 'locations', 'inventory_levels']),
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
      const savepointName = `sp_${change.local_id.replace(/[^a-zA-Z0-9]/g, '_')}`;
      try {
        // Create savepoint for this change
        await client.query(`SAVEPOINT ${savepointName}`);
        
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
        
        // Filter out reserved columns that are managed by server
        const reservedColumns = ['id', 'local_id', 'organization_id', 'sync_version', 'created_at', 'updated_at', 'deleted_at'];
        let filteredData = Object.fromEntries(
          Object.entries(change.data).filter(([key]) => !reservedColumns.includes(key))
        );
        
        // Resolve foreign key references (local_id -> server id)
        const foreignKeyColumns = ['category_id', 'vendor_id', 'location_id', 'product_id'];
        let skipChange = false;
        for (const fkCol of foreignKeyColumns) {
          if (skipChange) break;
          if (filteredData[fkCol] && typeof filteredData[fkCol] === 'string') {
            // Determine which table to look up
            let refTable = '';
            if (fkCol === 'category_id') refTable = 'categories';
            else if (fkCol === 'vendor_id') refTable = 'vendors';
            else if (fkCol === 'location_id') refTable = 'locations';
            else if (fkCol === 'product_id') refTable = 'products';
            
            if (refTable) {
              // For locations, lookup by name since client sends location name as location_id
              const lookupColumn = fkCol === 'location_id' ? 'name' : 'local_id';
              const fkResult = await client.query(
                `SELECT id FROM ${refTable} WHERE ${lookupColumn} = $1 AND organization_id = $2`,
                [filteredData[fkCol], organization_id]
              );
              if (fkResult.rows.length > 0) {
                filteredData[fkCol] = fkResult.rows[0].id;
              } else {
                // Foreign key not found - skip this change for now
                console.log(`Foreign key ${fkCol}=${filteredData[fkCol]} not found, deferring change`);
                errors.push({
                  local_id: change.local_id,
                  error: `Referenced ${fkCol} not yet synced`,
                });
                skipChange = true;
              }
            }
          }
        }
        
        if (skipChange) continue;
        
        if (change.operation === 'create') {
          const columns = Object.keys(filteredData);
          const values = Object.values(filteredData);
          
          // Build query dynamically
          const columnList = ['id', 'local_id', 'organization_id', ...columns, 'sync_version', 'created_at', 'updated_at'];
          const paramList = ['gen_random_uuid()', '$1', '$2', ...values.map((_, i) => `$${i + 3}`), `$${values.length + 3}`];
          
          const query = `INSERT INTO ${change.table} (${columnList.join(', ')})
             VALUES (${paramList.join(', ')}, NOW(), NOW())
             RETURNING id`;
          
          result = await client.query(
            query,
            [change.local_id, organization_id, ...values, change.client_version]
          );
        } else if (change.operation === 'update') {
          const columns = Object.keys(filteredData);
          const values = Object.values(filteredData);
          
          // Build SET clause dynamically
          let setClause;
          if (columns.length > 0) {
            const updates = columns.map((key, i) => `${key} = $${i + 3}`).join(', ');
            setClause = `${updates}, sync_version = $${values.length + 3}`;
          } else {
            setClause = `sync_version = $3`;
          }
          
          result = await client.query(
            `UPDATE ${change.table}
             SET ${setClause}, updated_at = NOW()
             WHERE local_id = $1 AND organization_id = $2
             RETURNING id`,
            [change.local_id, organization_id, ...values, change.client_version]
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
        
        // Release savepoint on success
        await client.query(`RELEASE SAVEPOINT ${savepointName}`);
      } catch (err) {
        // Rollback to savepoint on error
        await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
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
    res.status(500).json({ error: 'Sync failed', details: err instanceof Error ? err.message : String(err) });
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
    const result = await pool.query(`
      SELECT 'products' as table_name, id, local_id, sync_version as server_sequence, 
             jsonb_build_object(
               'name', name, 'sku', sku, 'barcode', barcode, 'category_id', category_id,
               'vendor_id', vendor_id, 'unit_of_measure', unit_of_measure, 'reorder_point', reorder_point,
               'reorder_quantity', reorder_quantity, 'unit_cost', unit_cost, 'purchase_link', purchase_link,
               'brand', brand, 'origin', origin, 'image_url', image_url, 'is_active', is_active
             ) as data,
             deleted_at
      FROM products 
      WHERE organization_id = $1 AND sync_version > $2
      
      UNION ALL
      
      SELECT 'categories' as table_name, id, local_id, sync_version as server_sequence,
             jsonb_build_object('name', name, 'qbo_account_id', qbo_account_id, 
               'qbo_asset_account_id', qbo_asset_account_id, 'is_active', is_active),
             deleted_at
      FROM categories
      WHERE organization_id = $1 AND sync_version > $2
      
      UNION ALL
      
      SELECT 'vendors' as table_name, id, local_id, sync_version as server_sequence,
             jsonb_build_object('name', name, 'contact_name', contact_name, 'email', email,
               'phone', phone, 'address', address, 'payment_terms', payment_terms,
               'lead_time_days', lead_time_days, 'qbo_vendor_id', qbo_vendor_id),
             deleted_at
      FROM vendors
      WHERE organization_id = $1 AND sync_version > $2
      
      UNION ALL
      
      SELECT 'locations' as table_name, id, local_id, sync_version as server_sequence,
             jsonb_build_object('name', name, 'is_active', is_active),
             deleted_at
      FROM locations
      WHERE organization_id = $1 AND sync_version > $2
      
      UNION ALL
      
      SELECT 'inventory_levels' as table_name, id, local_id, sync_version as server_sequence,
             jsonb_build_object('product_id', product_id, 'location_id', location_id,
               'quantity_on_hand', quantity_on_hand, 'quantity_reserved', quantity_reserved),
             deleted_at
      FROM inventory_levels
      WHERE organization_id = $1 AND sync_version > $2
      
      ORDER BY server_sequence
      LIMIT $3
    `, [organization_id, since, limit]);
    
    const changes = result.rows.map(row => ({
      table: row.table_name,
      operation: row.deleted_at ? 'delete' : 'update',
      server_id: row.id,
      local_id: row.local_id,
      server_sequence: row.server_sequence,
      data: row.data,
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
    res.status(500).json({ error: 'Sync failed', details: err instanceof Error ? err.message : String(err) });
  }
});

export { router as syncRouter };
