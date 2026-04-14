# Gloss Inventory — Sync Architecture

## Core Principles

1. **Local-First**: Client owns the data, server validates and replicates
2. **Optimistic UI**: Changes appear instantly, sync happens in background
3. **Conflict Resolution**: Server timestamp wins, but flag for review
4. **Idempotency**: Same operation twice = same result
5. **Event Sourcing**: All changes are events, current state is a projection

---

## Sync Flow Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client (PWA)  │────▶│   Sync Queue    │────▶│  Cloud Server   │
│  IndexedDB      │     │  (Background    │     │   PostgreSQL    │
│                 │◀────│   Sync)         │◀────│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   Local State              Sync Status           QBO Integration
   (Instant UI)            (Pending/OK)          (Async Jobs)
```

---

## Client-Side Architecture (IndexedDB)

### Database Structure

```javascript
// IndexedDB Schema (mirrors PostgreSQL)
const DB_NAME = 'GlossInventory';
const DB_VERSION = 1;

const STORES = {
  // Core data
  products: 'id, local_id, barcode, category_id, sync_status',
  product_variants: 'id, local_id, product_id, barcode',
  inventory_levels: 'id, product_id, variant_id, location_id',
  
  // Transactions (never delete, only append)
  inventory_transactions: 'id, local_id, product_id, created_at, sync_status',
  
  // Queue for sync
  sync_queue: 'id, table_name, record_id, sync_status, created_at',
  
  // Metadata
  sync_state: 'id', // Last sync timestamp, device ID
  users: 'id, email',
  categories: 'id',
  locations: 'id',
  vendors: 'id'
};
```

### Sync State Management

```javascript
// syncState record (single row in IndexedDB)
{
  id: 'current',
  device_id: 'gloss-ipad-front-desk-001', // Generated once, stored permanently
  last_sync_at: '2026-04-14T08:15:00Z',
  last_sync_sequence: 15234, // Server sequence number for delta sync
  is_syncing: false,
  pending_count: 3, // Items in local queue
  last_error: null,
  last_error_at: null
}
```

---

## Sync Protocol

### 1. Client → Server (Push Local Changes)

```javascript
// POST /api/sync/push
{
  device_id: 'gloss-ipad-front-desk-001',
  organization_id: 'uuid-gloss-heights',
  changes: [
    {
      local_id: 'local-prod-001-abc123',
      table: 'products',
      operation: 'create', // or 'update', 'delete'
      data: {
        name: 'OPI Lincoln Park After Dark',
        category_id: 'uuid-nail-polish',
        barcode: '123456789012',
        // ... full record
      },
      client_timestamp: '2026-04-14T08:15:30.123Z',
      client_version: 1 // Increment on each client edit
    },
    {
      local_id: 'local-tx-001-def456',
      table: 'inventory_transactions',
      operation: 'create',
      data: {
        product_id: 'uuid-server-prod-001',
        location_id: 'uuid-back-bar',
        transaction_type: 'consumption',
        quantity: -1,
        unit_cost: 8.50,
        reference_type: 'service',
        notes: 'Manicure service'
      },
      client_timestamp: '2026-04-14T08:16:00.456Z',
      client_version: 1
    }
  ]
}
```

### 2. Server Response

```javascript
{
  accepted: [
    { local_id: 'local-prod-001-abc123', server_id: 'uuid-server-001', status: 'created' },
    { local_id: 'local-tx-001-def456', server_id: 'uuid-server-tx-001', status: 'created' }
  ],
  conflicts: [
    // When server has newer version
    {
      local_id: 'local-prod-002-xyz789',
      server_id: 'uuid-server-002',
      conflict_type: 'version_mismatch',
      server_data: { /* current server state */ },
      resolution: 'server_wins' // or 'client_wins' if configured
    }
  ],
  errors: [
    // Validation failures
    {
      local_id: 'local-prod-003-fail',
      error: 'barcode_already_exists',
      message: 'Barcode 123456789012 already assigned to another product'
    }
  ],
  server_sequence: 15236 // New checkpoint for next pull
}
```

### 3. Server → Client (Pull Remote Changes)

```javascript
// GET /api/sync/pull?since=15234&limit=100
{
  changes: [
    {
      table: 'products',
      operation: 'update',
      server_id: 'uuid-server-prod-123',
      server_sequence: 15235,
      server_timestamp: '2026-04-14T08:14:00Z',
      data: {
        // Full record or delta
        reorder_point: 5 // changed field
      }
    },
    {
      table: 'inventory_transactions',
      operation: 'create',
      server_id: 'uuid-server-tx-789',
      server_sequence: 15236,
      data: { /* full transaction */ }
    }
  ],
  has_more: false,
  new_sequence: 15236
}
```

---

## Conflict Resolution Strategy

### When Conflicts Occur

A conflict happens when:
1. Client edits a record that was changed on server since last sync
2. Two devices edit the same record offline
3. Server validation fails (duplicate barcode, etc.)

### Resolution Rules

| Scenario | Resolution | User Action |
|----------|-----------|-------------|
| Same field edited | Server wins, client change logged | Notification banner |
| Client creates duplicate barcode | Reject, flag for review | Alert with suggestion |
| Concurrent edits to different fields | Merge (both changes applied) | Silent |
| Delete vs. Update | Update wins (undelete) | Notification |

### Conflict Storage

```javascript
// IndexedDB conflicts store (for review)
{
  id: 'conflict-uuid',
  table: 'products',
  local_id: 'local-prod-002',
  server_id: 'uuid-server-002',
  conflict_at: '2026-04-14T08:15:00Z',
  local_data: { name: 'OPI Red', reorder_point: 3 },
  server_data: { name: 'OPI Big Apple Red', reorder_point: 5 },
  status: 'pending', // or 'resolved_local', 'resolved_server', 'merged'
  resolved_by: null,
  resolved_at: null
}
```

---

## Background Sync Implementation

### Service Worker Strategy

```javascript
// service-worker.js

const SYNC_TAG = 'gloss-inventory-sync';

// Queue sync when online
self.addEventListener('sync', event => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncPendingChanges());
  }
});

// Also sync on message from app
self.addEventListener('message', event => {
  if (event.data.type === 'TRIGGER_SYNC') {
    syncPendingChanges();
  }
});

async function syncPendingChanges() {
  const db = await openDB('GlossInventory', 1);
  
  // 1. Push local changes
  const pending = await db.getAllFromIndex('sync_queue', 'sync_status', 'pending');
  
  if (pending.length > 0) {
    const response = await fetch('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes: pending })
    });
    
    const result = await response.json();
    
    // Update local records with server IDs
    for (const accepted of result.accepted) {
      await updateLocalRecord(db, accepted.local_id, {
        id: accepted.server_id,
        sync_status: 'synced'
      });
      await db.delete('sync_queue', accepted.local_id);
    }
    
    // Store conflicts for review
    for (const conflict of result.conflicts) {
      await db.put('conflicts', conflict);
    }
  }
  
  // 2. Pull server changes
  const syncState = await db.get('sync_state', 'current');
  const pullResponse = await fetch(
    `/api/sync/pull?since=${syncState.last_sync_sequence}`
  );
  
  const pullResult = await pullResponse.json();
  
  for (const change of pullResult.changes) {
    await applyServerChange(db, change);
  }
  
  // 3. Update sync state
  await db.put('sync_state', {
    ...syncState,
    last_sync_at: new Date().toISOString(),
    last_sync_sequence: pullResult.new_sequence,
    pending_count: await db.count('sync_queue', 'sync_status', 'pending')
  });
}
```

### Optimistic UI Pattern

```javascript
// React/Vue pattern for instant UI updates

async function addProduct(productData) {
  const local_id = generateLocalId();
  const optimisticProduct = {
    ...productData,
    local_id,
    id: null, // Will be filled by server
    sync_status: 'pending',
    created_at: new Date().toISOString()
  };
  
  // 1. Save to IndexedDB (instant)
  await db.put('products', optimisticProduct);
  await db.put('sync_queue', {
    local_id,
    table: 'products',
    operation: 'create',
    data: productData,
    sync_status: 'pending'
  });
  
  // 2. Update UI immediately (optimistic)
  updateUI(optimisticProduct);
  
  // 3. Trigger background sync
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(SYNC_TAG);
  }
  
  // 4. Show pending indicator
  showPendingCount(await getPendingCount());
}
```

---

## Offline Capability by Feature

| Feature | Offline Behavior | Sync Trigger |
|---------|---------------|--------------|
| **View inventory** | Full cache, works completely offline | Background refresh when online |
| **Scan barcode** | Local lookup, works offline | N/A |
| **Add product** | Queue locally, show "saving..." | Immediate sync attempt, queue if fails |
| **Edit product** | Queue locally, optimistic UI | Debounced sync (5 sec idle) |
| **Record consumption** | Queue locally, optimistic UI | Immediate sync attempt |
| **Physical count** | Queue locally, optimistic UI | Immediate sync attempt |
| **Create PO** | Queue locally, save draft | Sync on "Send to Vendor" |
| **View reports** | Last cached data, stale indicator | Background refresh |
| **QBO sync** | N/A (server-side only) | Server pushes to QBO when online |

---

## QBO Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER SIDE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Inventory Transaction Created ──▶ Queue for QBO Sync ──▶ Retry?  │
│         │                              │                  │     │
│         │                              ▼                  │     │
│         │                       ┌────────────┐          │     │
│         │                       │ QBO API    │◀─────────┘     │
│         │                       │ Create Bill│                 │
│         │                       │ or Journal │                 │
│         │                       └────────────┘                 │
│         │                              │                     │
│         ▼                              ▼                     │
│  ┌──────────────┐              ┌──────────────┐              │
│  │ transactions │              │ transactions │              │
│  │ .qbo_synced  │              │ .qbo_error   │              │
│  └──────────────┘              └──────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### QBO Sync Queue (PostgreSQL)

```sql
CREATE TABLE qbo_sync_queue (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    transaction_id UUID REFERENCES inventory_transactions(id),
    qbo_operation VARCHAR(50), -- 'create_bill', 'create_journal', 'update_item'
    payload JSONB,
    attempt_count INTEGER DEFAULT 0,
    next_attempt_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Error Handling & Retry

```javascript
// Exponential backoff for failed syncs
const MAX_RETRIES = 5;
const BACKOFF_MS = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m

async function processSyncQueue() {
  const pending = await getPendingChanges();
  
  for (const item of pending) {
    if (item.attempt_count >= MAX_RETRIES) {
      await flagForManualReview(item);
      continue;
    }
    
    const delay = BACKOFF_MS[Math.min(item.attempt_count, BACKOFF_MS.length - 1)];
    const nextAttempt = new Date(Date.now() + delay);
    
    try {
      await attemptSync(item);
      await markCompleted(item);
    } catch (error) {
      await markFailed(item, error, nextAttempt);
    }
  }
}
```

---

## Security Considerations

1. **Device Authentication**: Each device registers with organization + PIN
2. **HTTPS Only**: All sync traffic encrypted
3. **Data Validation**: Server validates all incoming data, never trusts client
4. **Rate Limiting**: Max 100 changes per sync request
5. **Audit Trail**: Every sync logged with device ID and IP

---

## Next Steps

1. **Implement IndexedDB layer** (client-side storage)
2. **Build sync API endpoints** (server-side)
3. **Create conflict resolution UI** (for managers)
4. **Add sync status indicator** (for all users)
5. **Test offline scenarios** (airplane mode, spotty wifi)

Ready to build the API specification?
