# Gloss Inventory

Offline-first inventory management for Gloss Nail Bar. Combines Sortly's ease of use with inFlow's financial depth.

## Quick Links

- [Database Schema](docs/database-schema.md)
- [Sync Architecture](docs/sync-architecture.md)
- [API Specification](docs/api-spec.md)
- [Component Inventory](docs/components.md)

## Live Demo

- **Frontend**: (deploy to Vercel/Netlify)
- **Backend API**: https://gloss-inventory.up.railway.app
- **Health Check**: https://gloss-inventory.up.railway.app/health

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| State | TanStack Query (React Query) + IndexedDB |
| Backend | Node.js + Express (Railway) |
| Database | PostgreSQL (Railway) + IndexedDB (local) |
| Sync | Service Worker + Background Sync API |

## Project Status

- ✅ Phase 0: Database Schema
- ✅ Phase 1: IndexedDB Layer
- ✅ Phase 1b: Service Worker / Background Sync
- ✅ Phase 2: React UI Components
- ✅ Phase 3: Server API (Railway deployed)
- ✅ Phase 4: Frontend-Backend Connection
- ⏳ Phase 5: QBO Integration

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start React dev server
npm run dev

# In another terminal, start local API server
cd server
npm install
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update `VITE_API_URL` in `.env`:
- Local: `http://localhost:3001`
- Production: `https://gloss-inventory.up.railway.app`

### Deploy to Railway

```bash
# Push to GitHub
git add .
git commit -m "Your changes"
git push origin main

# Railway auto-deploys on push
```

## File Structure

```
gloss-inventory/
├── docs/                    # Documentation
│   ├── database-schema.md
│   ├── sync-architecture.md
│   ├── api-spec.md
│   └── components.md
├── src/
│   ├── api/               # API client
│   │   └── client.ts
│   ├── db/                # IndexedDB layer
│   │   ├── schema.ts
│   │   ├── database.ts
│   │   ├── sync-queue.ts
│   │   └── operations/
│   ├── components/        # React components
│   ├── hooks/             # React hooks
│   │   ├── useProducts.ts
│   │   ├── useCategories.ts
│   │   └── useSync.ts
│   └── App.tsx
├── server/                # Express API
│   ├── src/
│   │   ├── index.ts
│   │   ├── db/
│   │   └── routes/
│   ├── package.json
│   └── tsconfig.json
├── public/
│   ├── service-worker.js  # Background sync
│   └── manifest.json
├── railway.json           # Railway config
├── .env.example           # Environment template
└── README.md
```

## Daily Development Log

See `memory/2026-04-14.md` for session notes and decisions.
