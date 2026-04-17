const CACHE_NAME = 'gloss-inventory-v1';
const SYNC_TAG = 'gloss-inventory-sync';

// API URL - change this to your Railway URL
const API_URL = 'https://gloss-inventory.up.railway.app';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Don't cache API calls or dev server files
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/@')) return; // Vite dev files
  if (url.pathname.includes('__openclaw')) return; // OpenClaw assets

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request).then(r => { if (r.ok) caches.open(CACHE_NAME).then(c => c.put(request, r)); }).catch(() => {});
    return cached;
  }
  return fetch(request);
}

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processSyncQueue());
  }
});

// Get auth token from client
async function getAuthTokenFromClient() {
  const clients = await self.clients.matchAll({ type: 'window' });
  if (clients.length === 0) return null;
  
  return new Promise((resolve) => {
    const channel = new BroadcastChannel('gloss-auth');
    channel.postMessage({ action: 'get-token' });
    channel.onmessage = (event) => {
      resolve(event.data.token);
    };
    setTimeout(() => resolve(null), 1000);
  });
}

// Get organization ID from client
async function getOrganizationIdFromClient() {
  const clients = await self.clients.matchAll({ type: 'window' });
  if (clients.length === 0) return null;
  
  return new Promise((resolve) => {
    const channel = new BroadcastChannel('gloss-auth');
    channel.postMessage({ action: 'get-org' });
    channel.onmessage = (event) => {
      resolve(event.data.orgId);
    };
    setTimeout(() => resolve(null), 1000);
  });
}

async function processSyncQueue() {
  const db = await openDB('GlossInventory', 1);
  if (!db) {
    console.error('[SW] Could not open IndexedDB');
    return;
  }

  try {
    // Get auth token and org ID from client
    const [authToken, orgId] = await Promise.all([
      getAuthTokenFromClient(),
      getOrganizationIdFromClient()
    ]);

    if (!authToken) {
      console.error('[SW] No auth token available');
      await notifyClients({ type: 'sync-error', error: 'Not authenticated' });
      return;
    }

    if (!orgId) {
      console.error('[SW] No organization ID available');
      await notifyClients({ type: 'sync-error', error: 'No organization' });
      return;
    }

    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const index = store.index('by_status');
    const pending = await index.getAll('pending');

    console.log('[SW] Found', pending.length, 'pending items to sync');

    if (pending.length === 0) {
      console.log('[SW] No pending items, skipping sync');
      return;
    }

    // Notify clients that sync started
    await notifyClients({ type: 'sync-started', count: pending.length });

    // Get device ID
    const deviceId = 'web-' + Math.random().toString(36).slice(2, 11);
    console.log('[SW] Using device ID:', deviceId);

    // Prepare changes
    const changes = pending.map(item => ({
      local_id: item.local_id,
      table_name: item.table_name,
      operation: item.operation,
      data: item.data,
      timestamp: item.created_at
    }));

    console.log('[SW] Sending', changes.length, 'changes to', API_URL);

    // Push to Railway API with auth token
    const response = await fetch(`${API_URL}/api/sync/push`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        device_id: deviceId,
        organization_id: orgId,
        changes: changes
      })
    });

    console.log('[SW] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SW] Sync failed:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('[SW] Sync result:', result);

    // Remove synced items from queue
    const writeTx = db.transaction('sync_queue', 'readwrite');
    const writeStore = writeTx.objectStore('sync_queue');

    let deletedCount = 0;
    for (const accepted of result.accepted || []) {
      await new Promise((resolve, reject) => {
        const deleteReq = writeStore.delete(accepted.local_id);
        deleteReq.onsuccess = () => {
          deletedCount++;
          resolve();
        };
        deleteReq.onerror = () => reject(deleteReq.error);
      });
    }

    console.log('[SW] Deleted', deletedCount, 'synced items from queue');

    // Notify clients
    await notifyClients({ type: 'sync-complete', processed: result.accepted?.length || 0, total: pending.length });

  } catch (err) {
    console.error('[SW] Sync error:', err);
    await notifyClients({ type: 'sync-error', error: err.message });
  }
}

function openDB(name, version) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve(null);
  });
}

async function getDeviceId() {
  // Generate or retrieve device ID
  const clients = await self.clients.matchAll({ type: 'window' });
  if (clients.length > 0) {
    return new Promise((resolve) => {
      const channel = new BroadcastChannel('gloss-device-id');
      channel.postMessage({ action: 'get' });
      channel.onmessage = (event) => resolve(event.data.device_id);
      setTimeout(() => resolve('unknown-device'), 1000);
    });
  }
  return 'unknown-device';
}

async function notifyClients(data) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(c => c.postMessage(data));
}

self.addEventListener('message', (event) => {
  if (event.data.type === 'TRIGGER_SYNC') {
    event.waitUntil(processSyncQueue());
  }
});

self.addEventListener('online', () => {
  if ('sync' in self.registration) {
    self.registration.sync.register(SYNC_TAG);
  }
  notifyClients({ type: 'online' });
});

self.addEventListener('offline', () => {
  notifyClients({ type: 'offline' });
});
