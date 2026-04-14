# Gloss Inventory

Offline-first inventory management for Gloss Nail Bar. Combines Sortly's ease of use with inFlow's financial depth.

## Quick Links

- [Database Schema](docs/database-schema.md)
- [Sync Architecture](docs/sync-architecture.md)
- [API Specification](docs/api-spec.md)
- [Component Inventory](docs/components.md)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| State | TanStack Query (React Query) + IndexedDB |
| Backend | Node.js + Express (planned) |
| Database | PostgreSQL (cloud) + IndexedDB (local) |
| Sync | Service Worker + Background Sync API |

## Project Status

- ✅ Phase 0: Database Schema
- ✅ Phase 1: IndexedDB Layer
- ✅ Phase 1b: Service Worker / Background Sync
- 🔄 Phase 2: React UI Components (in progress)
- ⏳ Phase 3: Server API
- ⏳ Phase 4: QBO Integration

## File Structure

```
gloss-inventory/
├── docs/                    # Documentation
│   ├── database-schema.md
│   ├── sync-architecture.md
│   ├── api-spec.md
│   └── components.md
├── src/
│   ├── db/                  # IndexedDB layer
│   │   ├── schema.ts
│   │   ├── database.ts
│   │   ├── sync-queue.ts
│   │   └── operations/
│   │       ├── products.ts
│   │       └── barcode.ts
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Page components
│   └── styles/              # Tailwind config
├── public/
│   ├── service-worker.js    # Background sync
│   └── manifest.json        # PWA manifest
└── README.md
```

## Daily Development Log

See `memory/2026-04-14.md` for session notes and decisions.
