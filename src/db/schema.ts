/**
 * Gloss Inventory - IndexedDB Schema
 * 
 * Mirrors the PostgreSQL schema for local-first operation.
 * All records have local_id for offline creation and id for server sync.
 */

export const DB_NAME = 'GlossInventory';
export const DB_VERSION = 1;

// Sync status for all records
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

// Base interface for all synced records
export interface SyncableRecord {
  id: string | null;           // Server UUID (null until synced)
  local_id: string;            // Client-generated UUID (always present)
  sync_status: SyncStatus;
  sync_version: number;        // Increment on each change
  created_at: string;          // ISO timestamp
  updated_at: string;          // ISO timestamp
  deleted_at?: string | null;  // Soft delete
}

// ============ CORE DATA MODELS ============

export interface Organization {
  id: string;
  name: string;
  qbo_company_id?: string;
  // QBO tokens not stored locally (security)
  created_at: string;
  updated_at: string;
}

export interface Location extends SyncableRecord {
  organization_id: string;
  name: string;
  is_active: boolean;
}

export interface Category extends SyncableRecord {
  organization_id: string;
  name: string;
  qbo_account_id?: string;        // COGS account
  qbo_asset_account_id?: string;  // Inventory asset account
  is_active: boolean;
}

export interface Vendor extends SyncableRecord {
  organization_id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  lead_time_days?: number;
  qbo_vendor_id?: string;
  is_active: boolean;
}

export interface Product extends SyncableRecord {
  organization_id: string;
  category_id: string | null;
  vendor_id?: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  unit_of_measure: string;        // 'bottle', 'pack', 'each', 'ml'
  reorder_point: number;
  reorder_quantity: number;
  unit_cost?: number;             // Average cost per unit
  purchase_link?: string;         // URL to purchase
  is_retail: boolean;
  is_backbar: boolean;
  is_professional_only: boolean;
  has_variants: boolean;
  expiration_tracking: boolean;
  image_url?: string;
  created_by?: string;
  updated_by?: string;
}

export interface ProductVariant extends SyncableRecord {
  product_id: string;
  variant_name: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  is_active: boolean;
}

export interface InventoryLevel {
  id: string;
  product_id: string;
  variant_id?: string;
  location_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  sync_status: SyncStatus;
  last_counted_at?: string;
  updated_at: string;
}

// Transaction types
export type TransactionType = 
  | 'purchase' 
  | 'sale' 
  | 'adjustment' 
  | 'transfer' 
  | 'consumption' 
  | 'count';

export type ReferenceType = 
  | 'purchase_order' 
  | 'sale_order' 
  | 'service' 
  | 'manual';

export interface InventoryTransaction extends SyncableRecord {
  organization_id: string;
  product_id: string;
  variant_id?: string;
  location_id: string;
  transaction_type: TransactionType;
  quantity: number;               // Positive = in, Negative = out
  unit_cost?: number;
  total_cost?: number;
  reference_type?: ReferenceType;
  reference_id?: string;
  notes?: string;
  performed_by?: string;
  qbo_synced_at?: string;
  qbo_error?: string;
  created_by?: string;
}

export interface CostLayer {
  id: string;
  product_id: string;
  variant_id?: string;
  purchase_order_id?: string;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  received_at: string;
  is_fully_consumed: boolean;
}

// ============ PURCHASE ORDERS ============

export type POStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';

export interface PurchaseOrder extends SyncableRecord {
  organization_id: string;
  vendor_id: string;
  po_number: string;
  status: POStatus;
  order_date: string;
  expected_date?: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes?: string;
  qbo_bill_id?: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  variant_id?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total: number;
}

// ============ SYNC SYSTEM ============

export type QueueOperation = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
  id: string;                     // UUID for this queue entry
  device_id: string;
  organization_id: string;
  table_name: string;             // 'products', 'inventory_transactions', etc.
  record_id: string | null;       // Server ID if known
  local_id: string;               // Client-generated ID
  operation: QueueOperation;
  payload: Record<string, unknown>; // Full record data
  sync_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  attempt_count: number;
  last_error?: string;
  created_at: string;
  processed_at?: string;
}

export interface SyncConflict {
  id: string;
  organization_id: string;
  table_name: string;
  record_id?: string;
  local_id: string;
  server_data?: Record<string, unknown>;
  client_data?: Record<string, unknown>;
  resolution?: 'server_wins' | 'client_wins' | 'merged' | 'pending';
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface SyncState {
  id: 'current';                  // Single row
  device_id: string;
  organization_id?: string;
  last_sync_at?: string;
  last_sync_sequence: number;
  is_syncing: boolean;
  pending_count: number;
  last_error?: string;
  last_error_at?: string;
}

// ============ USERS & METADATA ============

export type UserRole = 'admin' | 'manager' | 'staff';

export interface User {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  role: UserRole;
  pin?: string;                   // For quick tablet login
  is_active: boolean;
  last_login_at?: string;
}

// ============ INDEXEDDB STORE NAMES ============

export const STORES = {
  organizations: 'organizations',
  locations: 'locations',
  categories: 'categories',
  vendors: 'vendors',
  products: 'products',
  product_variants: 'product_variants',
  inventory_levels: 'inventory_levels',
  inventory_transactions: 'inventory_transactions',
  cost_layers: 'cost_layers',
  purchase_orders: 'purchase_orders',
  purchase_order_items: 'purchase_order_items',
  sync_queue: 'sync_queue',
  sync_conflicts: 'sync_conflicts',
  sync_state: 'sync_state',
  users: 'users',
} as const;

// ============ INDEX DEFINITIONS ============

export interface StoreIndex {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}

export const STORE_INDICES: Record<string, StoreIndex[]> = {
  [STORES.products]: [
    { name: 'by_barcode', keyPath: ['organization_id', 'barcode'] },
    { name: 'by_local_id', keyPath: ['organization_id', 'local_id'] },
    { name: 'by_category', keyPath: 'category_id' },
    { name: 'by_sync', keyPath: ['organization_id', 'sync_status'] },
  ],
  [STORES.product_variants]: [
    { name: 'by_product', keyPath: 'product_id' },
    { name: 'by_barcode', keyPath: 'barcode' },
  ],
  [STORES.inventory_levels]: [
    { name: 'by_product_location', keyPath: ['product_id', 'location_id'] },
    { name: 'by_location', keyPath: 'location_id' },
  ],
  [STORES.inventory_transactions]: [
    { name: 'by_product', keyPath: 'product_id' },
    { name: 'by_date', keyPath: ['organization_id', 'created_at'] },
    { name: 'by_sync', keyPath: ['organization_id', 'sync_status'] },
  ],
  [STORES.sync_queue]: [
    { name: 'by_status', keyPath: 'sync_status' },
    { name: 'by_table', keyPath: 'table_name' },
  ],
  [STORES.sync_conflicts]: [
    { name: 'by_status', keyPath: 'resolution' },
  ],
};

// ============ HELPER TYPES ============

// For type-safe store access
export type StoreName = keyof typeof STORES;
export type StoreRecord = 
  | Organization
  | Location
  | Category
  | Vendor
  | Product
  | ProductVariant
  | InventoryLevel
  | InventoryTransaction
  | CostLayer
  | PurchaseOrder
  | PurchaseOrderItem
  | SyncQueueItem
  | SyncConflict
  | SyncState
  | User;
