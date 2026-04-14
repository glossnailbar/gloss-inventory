const CACHE_NAME = 'gloss-inventory-v1';
const SYNC_TAG = 'gloss-inventory-sync';

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

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ error: 'offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request).then(r => { if (r.ok) caches.open(CACHE_NAME).then(c => c.put(request, r)); }).catch(() => {});
    return cached;
  }
  return fetch(request);
}

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  const db = await openDB('GlossInventory', 1);
  if (!db) return;
  
  const tx = db.transaction('sync_queue', 'readonly');
  const store = tx.objectStore('sync_queue');
  const index = store.index('by_status');
  const pending = await index.getAll('pending');
  
  if (pending.length === 0) return;
  
  try {
    const response = await fetch('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes: pending })
    });
    
    if (!response.ok) throw new Error('Sync failed');
    
    const result = await response.json();
    
    const writeTx = db.transaction('sync_queue', 'readwrite');
    const writeStore = writeTx.objectStore('sync_queue');
    
    for (const accepted of result.accepted || []) {
      writeStore.delete(accepted.local_id);
    }
    
    await notifyClients({ type: 'sync-complete', processed: result.accepted?.length || 0 });
  } catch (err) {
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
