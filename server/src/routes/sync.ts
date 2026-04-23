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
router.get('/pull', async (req: any, res) => {
  try {
    const since = parseInt(req.query.since as string) || 0;
    const offset = parseInt(req.query.offset as string) || 0;
    // Use organization from auth token as source of truth
    const organization_id = req.user?.organizationId || req.query.org as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    
    console.log('[Sync Pull] Request from user:', req.user?.userId, 'org from token:', req.user?.organizationId);
    console.log('[Sync Pull] Using organization:', organization_id, 'since:', since, 'offset:', offset);
    
    if (!organization_id) {
      return res.status(400).json({ error: 'organization_id required' });
    }
    
    console.log('[Sync Pull] Using organization:', organization_id, 'since:', since, 'offset:', offset);
    
    // Query for changes across all tables since sequence with pagination
    const result = await pool.query(`
      SELECT * FROM (
        SELECT 'products' as table_name, p.id, COALESCE(p.local_id, p.id::text) as local_id, COALESCE(p.sync_version, 1) as server_sequence, p.created_at,
               jsonb_build_object(
                 'name', p.name, 'sku', p.sku, 'barcode', p.barcode, 'category_id', COALESCE(c.local_id, c.id::text),
                 'vendor_id', COALESCE(v.local_id, v.id::text), 'unit_of_measure', p.unit_of_measure, 'reorder_point', p.reorder_point,
                 'reorder_quantity', p.reorder_quantity, 'max_level', p.max_level, 'unit_cost', p.unit_cost,
                 'purchase_link', p.purchase_link, 'brand', p.brand, 'origin', p.origin, 'tags', p.tags,
                 'item_size', p.item_size, 'price_per', p.price_per, 'pcs_per_box', p.pcs_per_box,
                 'attribute1_name', p.attribute1_name, 'attribute1_value', p.attribute1_value,
                 'attribute2_name', p.attribute2_name, 'attribute2_value', p.attribute2_value,
                 'attribute3_name', p.attribute3_name, 'attribute3_value', p.attribute3_value,
                 'image_url', p.image_url, 'image_url2', p.image_url2, 'image_url3', p.image_url3,
                 'is_retail', p.is_retail, 'is_backbar', p.is_backbar, 'is_professional_only', p.is_professional_only,
                 'has_variants', p.has_variants, 'expiration_tracking', p.expiration_tracking,
                 'description', p.description, 'is_active', p.is_active
               ) as data,
               p.deleted_at
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN vendors v ON v.id = p.vendor_id
        WHERE p.organization_id = $1 AND (p.sync_version > $2 OR p.sync_version IS NULL OR p.sync_version = 0)
        
        UNION ALL
        
        SELECT 'categories' as table_name, c.id, COALESCE(c.local_id, c.id::text) as local_id, COALESCE(c.sync_version, 1) as server_sequence, c.created_at,
               jsonb_build_object('name', c.name, 'qbo_account_id', c.qbo_account_id, 
                 'qbo_asset_account_id', c.qbo_asset_account_id, 'is_active', c.is_active),
               c.deleted_at
        FROM categories c
        WHERE c.organization_id = $1 AND (c.sync_version > $2 OR c.sync_version IS NULL OR c.sync_version = 0)
        
        UNION ALL
        
        SELECT 'vendors' as table_name, v.id, COALESCE(v.local_id, v.id::text) as local_id, COALESCE(v.sync_version, 1) as server_sequence, v.created_at,
               jsonb_build_object('name', v.name, 'contact_name', v.contact_name, 'email', v.email,
                 'phone', v.phone, 'address', v.address, 'payment_terms', v.payment_terms,
                 'lead_time_days', v.lead_time_days, 'qbo_vendor_id', v.qbo_vendor_id),
               v.deleted_at
        FROM vendors v
        WHERE v.organization_id = $1 AND (v.sync_version > $2 OR v.sync_version IS NULL OR v.sync_version = 0)
        
        UNION ALL
        
        SELECT 'locations' as table_name, l.id, COALESCE(l.local_id, l.id::text) as local_id, COALESCE(l.sync_version, 1) as server_sequence, l.created_at,
               jsonb_build_object('name', l.name, 'local_id', COALESCE(l.local_id, l.id::text), 'is_active', l.is_active),
               l.deleted_at
        FROM locations l
        WHERE l.organization_id = $1 AND (l.sync_version > $2 OR l.sync_version IS NULL OR l.sync_version = 0)
        
        UNION ALL
        
        SELECT 'inventory_levels' as table_name, il.id, COALESCE(il.local_id, il.id::text) as local_id, COALESCE(il.sync_version, 1) as server_sequence, il.created_at,
               jsonb_build_object('product_id', COALESCE(p.local_id, p.id::text), 'location_id', COALESCE(l.local_id, l.id::text),
                 'quantity_on_hand', il.quantity_on_hand, 'quantity_reserved', il.quantity_reserved,
                 'product_server_id', il.product_id, 'location_server_id', il.location_id),
               il.deleted_at
        FROM inventory_levels il
        JOIN products p ON p.id = il.product_id
        JOIN locations l ON l.id = il.location_id
        WHERE il.organization_id = $1 AND (il.sync_version > $2 OR il.sync_version IS NULL OR il.sync_version = 0)
      ) combined
      ORDER BY server_sequence, created_at, local_id
      LIMIT $3 OFFSET $4
    `, [organization_id, since, limit, offset]);
    
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
      new_sequence: since,
      new_offset: offset + changes.length,
    });
  } catch (err) {
    console.error('Pull failed:', err);
    res.status(500).json({ error: 'Sync failed', details: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/sync/setup-inventory - One-time setup to create inventory_levels for all products
router.post('/setup-inventory', async (req, res) => {
  try {
    const organization_id = req.body.organization_id;
    
    if (!organization_id) {
      return res.status(400).json({ error: 'organization_id required' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get or create a default location
      let locationId = '00000000-0000-0000-0000-000000000001';
      const locationCheck = await client.query(
        'SELECT id FROM locations WHERE organization_id = $1 LIMIT 1',
        [organization_id]
      );
      
      if (locationCheck.rows.length === 0) {
        // Create default location
        await client.query(
          `INSERT INTO locations (id, local_id, organization_id, name, is_active, sync_version, created_at, updated_at)
           VALUES ($1, $2, $3, $4, true, 1, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          [locationId, 'default-loc-' + organization_id.slice(0, 8), organization_id, 'Main']
        );
      } else {
        locationId = locationCheck.rows[0].id;
      }
      
      // Create inventory_levels for all products that don't have them
      const result = await client.query(
        `INSERT INTO inventory_levels (
          id, local_id, product_id, location_id,
          quantity_on_hand, quantity_reserved, organization_id,
          sync_version, created_at, updated_at
        )
        SELECT 
          gen_random_uuid(),
          gen_random_uuid()::text,
          p.id,
          $2,
          0,
          0,
          p.organization_id,
          1,
          NOW(),
          NOW()
        FROM products p
        WHERE p.organization_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM inventory_levels il WHERE il.product_id = p.id
          )
        RETURNING id`,
        [organization_id, locationId]
      );
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        created: result.rows.length,
        message: `Created ${result.rows.length} inventory levels for products without them`
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Setup inventory failed:', err);
    res.status(500).json({ error: 'Setup failed', details: err instanceof Error ? err.message : String(err) });
  }
});

export { router as syncRouter };
