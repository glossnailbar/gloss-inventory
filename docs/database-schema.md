# Gloss Inventory — Database Schema

## Design Principles

1. **Offline-First**: Every record has `local_id`, `sync_status`, timestamps for conflict resolution
2. **Multi-Tenant**: Ready for multiple Gloss locations if needed
3. **Audit Trail**: All changes tracked for reporting and debugging
4. **Category-Driven COGS**: Categories map to QBO accounts for margin analysis

---

## Core Tables

### `organizations`
Top-level tenant (Gloss Nail Bar, future locations)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | "Gloss Nail Bar - Heights" |
| `qbo_company_id` | VARCHAR(255) | QuickBooks company identifier |
| `qbo_access_token` | TEXT | Encrypted OAuth token |
| `qbo_refresh_token` | TEXT | Encrypted refresh token |
| `qbo_token_expires_at` | TIMESTAMP | For auto-refresh |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

---

### `locations`
Physical locations within organization (Front Desk, Back Bar, Storage)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → organizations |
| `name` | VARCHAR(255) | "Front Desk", "Back Bar", "Storage Room" |
| `is_active` | BOOLEAN | Soft delete |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

---

### `categories`
Product categories with QBO account mapping for COGS tracking

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → organizations |
| `name` | VARCHAR(255) | "Polish", "Tools", "Disposables", "Retail" |
| `qbo_account_id` | VARCHAR(255) | QBO COGS account for this category |
| `qbo_asset_account_id` | VARCHAR(255) | QBO Inventory Asset account |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Example Categories for Gloss:**
- Nail Polish (Color/Gel)
- Pedicure Supplies
- Manicure Supplies
- Tools & Equipment
- Disposables (Files, Cotton, etc.)
- Sanitation & Cleaning
- Retail Products
- Back Bar Products

---

### `vendors`
Suppliers and manufacturers

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → organizations |
| `name` | VARCHAR(255) | "OPI", "CND", "Sally Beauty" |
| `contact_name` | VARCHAR(255) | |
| `email` | VARCHAR(255) | |
| `phone` | VARCHAR(255) | |
| `address` | TEXT | |
| `payment_terms` | VARCHAR(100) | "Net 30", "Due on Receipt" |
| `lead_time_days` | INTEGER | Average delivery time |
| `qbo_vendor_id` | VARCHAR(255) | Synced vendor ID |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

---

### `products`
Individual inventory items

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key (server) |
| `local_id` | VARCHAR(255) | Client-generated, unique per device |
| `organization_id` | UUID | FK → organizations |
| `category_id` | UUID | FK → categories |
| `vendor_id` | UUID | FK → vendors (nullable) |
| `name` | VARCHAR(255) | "OPI Lincoln Park After Dark" |
| `sku` | VARCHAR(255) | Internal SKU |
| `barcode` | VARCHAR(255) | UPC/EAN |
| `description` | TEXT | |
| `unit_of_measure` | VARCHAR(50) | "bottle", "pack", "each", "ml" |
| `reorder_point` | DECIMAL(10,2) | Alert when stock drops below this |
| `reorder_quantity` | DECIMAL(10,2) | Suggested restock amount |
| `is_retail` | BOOLEAN | Sell to customers? |
| `is_backbar` | BOOLEAN | Use in services? |
| `is_professional_only` | BOOLEAN | Not for retail sale |
| `has_variants` | BOOLEAN | Color/size variants? |
| `expiration_tracking` | BOOLEAN | Track expiration dates? |
| `image_url` | TEXT | Primary product image |
| `sync_status` | ENUM | 'synced', 'pending', 'conflict', 'error' |
| `sync_version` | INTEGER | Increment on each change |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |
| `created_by` | UUID | FK → users |
| `updated_by` | UUID | FK → users |
| `deleted_at` | TIMESTAMP | Soft delete |

**Indexes:**
- `organization_id + barcode` (for quick scan lookup)
- `organization_id + local_id` (for sync resolution)
- `category_id`
- `sync_status` (for sync queue)

---

### `product_variants`
Color/size variations (e.g., same polish, different colors)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `local_id` | VARCHAR(255) | Client-generated |
| `product_id` | UUID | FK → products |
| `variant_name` | VARCHAR(255) | "Lincoln Park After Dark" |
| `sku` | VARCHAR(255) | Variant-specific SKU |
| `barcode` | VARCHAR(255) | Variant barcode |
| `image_url` | TEXT | Variant image |
| `is_active` | BOOLEAN | |
| `sync_status` | ENUM | 'synced', 'pending', 'conflict', 'error' |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |
| `deleted_at` | TIMESTAMP | |

---

### `inventory_levels`
Current stock per location (can be per variant)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `product_id` | UUID | FK → products |
| `variant_id` | UUID | FK → product_variants (nullable) |
| `location_id` | UUID | FK → locations |
| `quantity_on_hand` | DECIMAL(10,3) | Current physical count |
| `quantity_reserved` | DECIMAL(10,3) | Committed to orders/services |
| `quantity_available` | DECIMAL(10,3) | Computed: on_hand - reserved |
| `sync_status` | ENUM | |
| `last_counted_at` | TIMESTAMP | Last physical count |
| `updated_at` | TIMESTAMP | |

**Note:** `quantity_available` is computed, not stored, to avoid drift.

---

### `inventory_transactions`
Every stock movement — the audit trail

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `local_id` | VARCHAR(255) | Client-generated |
| `organization_id` | UUID | FK → organizations |
| `product_id` | UUID | FK → products |
| `variant_id` | UUID | FK → product_variants (nullable) |
| `location_id` | UUID | FK → locations |
| `transaction_type` | ENUM | 'purchase', 'sale', 'adjustment', 'transfer', 'consumption', 'count' |
| `quantity` | DECIMAL(10,3) | Positive = in, Negative = out |
| `unit_cost` | DECIMAL(10,4) | Cost at time of transaction |
| `total_cost` | DECIMAL(10,2) | quantity × unit_cost |
| `reference_type` | VARCHAR(50) | 'purchase_order', 'sale_order', 'service', 'manual' |
| `reference_id` | UUID | FK to source document |
| `notes` | TEXT | "Damaged in shipping", "Backbar use" |
| `performed_by` | UUID | FK → users |
| `sync_status` | ENUM | |
| `qbo_synced_at` | TIMESTAMP | When pushed to QBO |
| `qbo_error` | TEXT | Error message if sync failed |
| `created_at` | TIMESTAMP | |
| `created_by` | UUID | FK → users |

**Critical for COGS:** This table drives cost calculations and QBO journal entries.

---

### `cost_layers`
FIFO/LIFO cost tracking (one row per receipt)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `product_id` | UUID | FK → products |
| `variant_id` | UUID | FK → product_variants (nullable) |
| `purchase_order_id` | UUID | FK → purchase_orders (nullable) |
| `quantity_received` | DECIMAL(10,3) | Original quantity |
| `quantity_remaining` | DECIMAL(10,3) | Unconsumed quantity |
| `unit_cost` | DECIMAL(10,4) | |
| `received_at` | TIMESTAMP | |
| `is_fully_consumed` | BOOLEAN | |

**Used for:** Accurate COGS under FIFO/LIFO costing methods.

---

### `purchase_orders`
POs to vendors

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `local_id` | VARCHAR(255) | Client-generated |
| `organization_id` | UUID | FK → organizations |
| `vendor_id` | UUID | FK → vendors |
| `po_number` | VARCHAR(100) | Human-readable PO # |
| `status` | ENUM | 'draft', 'sent', 'partial', 'received', 'cancelled' |
| `order_date` | DATE | |
| `expected_date` | DATE | |
| `subtotal` | DECIMAL(10,2) | |
| `tax_amount` | DECIMAL(10,2) | |
| `total` | DECIMAL(10,2) | |
| `notes` | TEXT | |
| `qbo_bill_id` | VARCHAR(255) | Linked QBO bill |
| `sync_status` | ENUM | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

---

### `purchase_order_items`
Line items on POs

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `purchase_order_id` | UUID | FK → purchase_orders |
| `product_id` | UUID | FK → products |
| `variant_id` | UUID | FK → product_variants (nullable) |
| `quantity_ordered` | DECIMAL(10,3) | |
| `quantity_received` | DECIMAL(10,3) | |
| `unit_cost` | DECIMAL(10,4) | Negotiated price |
| `total` | DECIMAL(10,2) | |

---

### `sync_queue`
Pending changes for offline sync

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → organizations |
| `device_id` | VARCHAR(255) | Originating device |
| `table_name` | VARCHAR(100) | 'products', 'inventory_transactions', etc. |
| `record_id` | UUID | PK of affected record |
| `local_id` | VARCHAR(255) | Client-generated ID |
| `operation` | ENUM | 'create', 'update', 'delete' |
| `payload` | JSONB | Full record data |
| `sync_status` | ENUM | 'pending', 'in_progress', 'completed', 'failed' |
| `attempt_count` | INTEGER | Retry counter |
| `last_error` | TEXT | Last error message |
| `created_at` | TIMESTAMP | |
| `processed_at` | TIMESTAMP | |

**Purpose:** Queue for background sync when connection restored.

---

### `sync_conflicts`
When server and client disagree

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → organizations |
| `table_name` | VARCHAR(100) | |
| `record_id` | UUID | |
| `local_id` | VARCHAR(255) | |
| `server_version` | JSONB | Server data at conflict time |
| `client_version` | JSONB | Client data at conflict time |
| `resolution` | ENUM | 'pending', 'server_wins', 'client_wins', 'merged' |
| `resolved_by` | UUID | FK → users |
| `resolved_at` | TIMESTAMP | |
| `created_at` | TIMESTAMP | |

---

### `users`
Staff who use the system

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → organizations |
| `email` | VARCHAR(255) | |
| `name` | VARCHAR(255) | |
| `role` | ENUM | 'admin', 'manager', 'staff' |
| `pin` | VARCHAR(10) | Quick login PIN for tablets |
| `is_active` | BOOLEAN | |
| `last_login_at` | TIMESTAMP | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

---

## Indexes for Performance

```sql
-- Sync performance
CREATE INDEX idx_products_sync ON products(organization_id, sync_status);
CREATE INDEX idx_transactions_sync ON inventory_transactions(organization_id, sync_status);
CREATE INDEX idx_queue_status ON sync_queue(organization_id, sync_status);

-- Lookup performance
CREATE INDEX idx_products_barcode ON products(organization_id, barcode);
CREATE INDEX idx_products_local ON products(organization_id, local_id);
CREATE INDEX idx_inventory_location ON inventory_levels(product_id, location_id);

-- Reporting
CREATE INDEX idx_transactions_date ON inventory_transactions(organization_id, created_at);
CREATE INDEX idx_transactions_type ON inventory_transactions(organization_id, transaction_type, created_at);
```

---

## Status

✅ **Implemented** — See `/src/db/schema.ts` for TypeScript types

## Next Steps

1. ✅ ~~Create migration files~~ — Types defined
2. ✅ ~~Design sync protocol~~ — See `sync-architecture.md`
3. ✅ ~~Build local storage layer~~ — IndexedDB layer complete
4. ✅ ~~Implement background sync worker~~ — Service worker complete
5. ⏳ **Build React UI components** — Next phase

