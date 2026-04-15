# Gloss Inventory - Feature Summary

**Last Updated:** April 14, 2026  
**Repository:** glossnailbar/gloss-inventory  
**Live URL:** https://gloss-inventory.up.railway.app

---

## Core Features

### 📍 Location Management
- **3 Active Locations:**
  - Salon - 504 W Gray
  - Storage - 1002
  - Storage - 1084
- Sidebar navigation by location
- URL-based filtering: `#/location/:id`
- Manage locations button for CRUD operations

### 📦 Item Management
- Photo-centric grid view (Sortly-style)
- Barcode scanning support
- Category filtering
- Full-text search
- Import from Sortly Excel

### 📄 Item Detail Page
- Full-page layout (no iframe scrolling)
- Image gallery (1/3 width desktop)
- **Inline editing** - edit fields directly on page
- Complete product information display
- Tags, attributes, vendor info

### 🔄 Inventory Transfer
- Move items between locations
- "Transfer Between Locations" section on item page
- From/To location selection
- Quantity validation
- Auto-deletes empty inventory records (0 qty)

### 📊 Activity History
- Per-item activity log
- Tracks:
  - 📤 Transfer Out
  - 📥 Transfer In
  - ✏️ Edits
  - ⚖️ Adjustments
  - ✨ Item Creation
- Timestamps and quantity changes

### 🧭 Navigation
- URL-based routing
- Click location in sidebar → filter by location
- Click location on item page → filter by location
- Back button navigation
- Mobile-responsive sidebar

---

## Technical Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Database:** IndexedDB (local-first)
- **Sync:** Background sync with sync queue
- **Icons:** SVG inline
- **Deployment:** Railway

---

## Database Schema (IndexedDB)

- `organizations`
- `locations` - Store locations
- `categories` - Product categories
- `vendors` - Supplier information
- `products` - Product data
- `inventory_levels` - Stock per location
- `inventory_transactions` - Stock movements
- `item_activity` - Activity history (v2)
- `sync_queue` - Pending sync operations

---

## Getting Started

### Local Development
```bash
cd gloss-inventory
npm install
npm run dev
```

### Build
```bash
npm run build
```

### Environment Variables
None required for local development (uses IndexedDB)

---

## Changelog

### April 14, 2026
- Added location management with 3 Sortly locations
- Implemented inline editing on item detail page
- Added inventory transfer between locations
- Created activity history logging system
- Fixed full-page scrolling (removed iframe effect)
- Added URL-based location filtering
- Integrated clickable location navigation

---

## Notes

- Requires IndexedDB - clear browser data if schema issues occur
- Activity history starts logging from implementation date
- DB_VERSION = 2 (bumped for item_activity store)
