# Gloss Inventory — API Specification

## Overview

RESTful API for syncing offline-first IndexedDB data to PostgreSQL.

Base URL: `https://api.glossinventory.com/v1` (production) / `http://localhost:3001` (dev)

---

## Authentication

All requests require Bearer token in header:

```
Authorization: Bearer {jwt_token}
```

---

## Endpoints

### Sync

#### POST `/sync/push`

Push local changes to server.

**Request:**
```json
{
  "device_id": "tablet-front-desk-001",
  "organization_id": "uuid-gloss-heights",
  "changes": [
    {
      "local_id": "local-prod-abc123",
      "table": "products",
      "operation": "create",
      "data": { /* product fields */ },
      "client_timestamp": "2026-04-14T09:00:00Z",
      "client_version": 1
    }
  ]
}
```

**Response:**
```json
{
  "accepted": [
    { "local_id": "local-prod-abc123", "server_id": "uuid-server-001", "status": "created" }
  ],
  "conflicts": [
    {
      "local_id": "local-prod-def456",
      "server_id": "uuid-server-002",
      "server_data": { /* current server state */ },
      "resolution": "server_wins"
    }
  ],
  "errors": [
    { "local_id": "local-prod-fail", "error": "barcode_already_exists" }
  ],
  "server_sequence": 15236
}
```

#### GET `/sync/pull?since={sequence}&limit=100`

Pull server changes since last sync.

**Response:**
```json
{
  "changes": [
    {
      "table": "products",
      "operation": "update",
      "server_id": "uuid-server-123",
      "server_sequence": 15235,
      "data": { /* changed fields */ }
    }
  ],
  "has_more": false,
  "new_sequence": 15236
}
```

---

### Products

#### GET `/products?org={org_id}&page=1&limit=50`

List products with pagination.

#### GET `/products/{id}`

Get single product.

#### POST `/products`

Create product (server-side, rarely used — prefer sync).

#### PUT `/products/{id}`

Update product (server-side, rarely used — prefer sync).

#### DELETE `/products/{id}`

Soft delete (server-side, rarely used — prefer sync).

---

### Inventory

#### GET `/inventory/{product_id}`

Get inventory levels for product.

#### POST `/inventory/adjust`

Server-side inventory adjustment.

---

### Categories

#### GET `/categories?org={org_id}`

List categories for organization.

#### POST `/categories`

Create category.

---

### Vendors

#### GET `/vendors?org={org_id}`

List vendors.

#### POST `/vendors`

Create vendor.

---

### Purchase Orders

#### GET `/purchase-orders?org={org_id}`

List POs.

#### POST `/purchase-orders`

Create PO (triggers QBO bill sync).

#### PUT `/purchase-orders/{id}/receive`

Receive PO (updates inventory + creates cost layer).

---

### Reports

#### GET `/reports/cogs?org={org_id}&start={date}&end={date}`

COGS report by category.

#### GET `/reports/inventory-value?org={org_id}`

Current inventory valuation.

---

### QuickBooks

#### POST `/qbo/connect`

Initiate OAuth flow.

#### POST `/qbo/sync`

Trigger manual QBO sync.

#### GET `/qbo/status`

QBO connection status.

---

## Status

⏳ **Pending Implementation** — Server not yet built

## Priority

1. `POST /sync/push` — Critical for offline sync
2. `GET /sync/pull` — Critical for offline sync
3. `GET /products` — For initial data load
4. `POST /purchase-orders` — For receiving inventory

See `memory/2026-04-14.md` for daily development notes.
