/**
 * Gloss Inventory - IndexedDB Database Manager
 *
 * Handles database initialization, connection management, and schema upgrades.
 * Uses Dexie.js pattern but with vanilla IndexedDB for zero dependencies.
 */

import {
  DB_NAME,
  DB_VERSION,
  STORES,
  STORE_INDICES,
  type StoreName,
  type StoreRecord,
  type SyncState,
} from './schema';

// Database instance singleton
let dbInstance: IDBDatabase | null = null;

/**
 * Generate a UUID v4 for local IDs
 */
export function generateLocalId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or generate device ID
 * Stored in localStorage for persistence across sessions
 */
export function getDeviceId(): string {
  const storageKey = 'gloss-device-id';
  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    // Generate new device ID with device type hint
    const deviceType = /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' :
                       /Mobile/i.test(navigator.userAgent) ? 'phone' : 'desktop';
    deviceId = `${deviceType}-${generateLocalId().split('-')[0]}`;
    localStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
}

/**
 * Initialize the IndexedDB database
 * Creates stores and indexes if they don't exist
 */
export async function initDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      // Create all stores
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          // Primary key: 'id' for most, 'local_id' for syncable records
          const keyPath = storeName === 'sync_state' ? 'id' :
                          storeName === 'organizations' ? 'id' :
                          storeName === 'inventory_levels' ? 'id' :
                          storeName === 'cost_layers' ? 'id' :
                          storeName === 'purchase_order_items' ? 'id' :
                          'local_id';

          const store = db.createObjectStore(storeName, { keyPath });

          // Add indexes
          const indices = STORE_INDICES[storeName] || [];
          indices.forEach((index) => {
            store.createIndex(index.name, index.keyPath, index.options);
          });
        }
      });

      console.log(`Database upgraded from v${oldVersion} to v${DB_VERSION}`);
    };
  });
}

/**
 * Get database instance (initializes if needed)
 */
export async function getDatabase(): Promise<IDBDatabase> {
  if (!dbInstance) {
    dbInstance = await initDatabase();
  }
  return dbInstance;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Clear all data (for logout/reset)
 */
export async function clearAllData(): Promise<void> {
  const db = await getDatabase();

  const stores = Object.values(STORES);
  const promises = stores.map((storeName) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });

  await Promise.all(promises);
}

/**
 * Export all data (for backup/debugging)
 */
export async function exportDatabase(): Promise<Record<string, unknown[]>> {
  const db = await getDatabase();
  const dataExport: Record<string, unknown[]> = {};

  for (const storeName of Object.values(STORES)) {
    dataExport[storeName] = await getAllFromStore(storeName);
  }

  return dataExport;
}

// ============ GENERIC CRUD OPERATIONS ============

/**
 * Get a record by key
 */
export async function getFromStore<T extends StoreRecord>(
  storeName: StoreName,
  key: string
): Promise<T | undefined> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all records from a store
 */
export async function getAllFromStore<T extends StoreRecord>(
  storeName: StoreName
): Promise<T[]> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Query by index
 */
export async function queryByIndex<T extends StoreRecord>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Put (insert or update) a record
 */
export async function putToStore<T extends StoreRecord>(
  storeName: StoreName,
  record: T
): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a record
 */
export async function deleteFromStore(
  storeName: StoreName,
  key: string
): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Count records in a store
 */
export async function countStore(
  storeName: StoreName,
  indexName?: string,
  value?: IDBValidKey | IDBKeyRange
): Promise<number> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);

    let request: IDBRequest;
    if (indexName && value !== undefined) {
      const index = store.index(indexName);
      request = index.count(value);
    } else {
      request = store.count();
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============ SYNC STATE MANAGEMENT ============

/**
 * Initialize or get sync state
 */
export async function getSyncState(): Promise<SyncState> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sync_state', 'readonly');
    const store = transaction.objectStore('sync_state');
    const request = store.get('current');

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result as SyncState);
      } else {
        // Initialize default state
        resolve({
          id: 'current',
          device_id: getDeviceId(),
          last_sync_sequence: 0,
          is_syncing: false,
          pending_count: 0,
        });
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update sync state
 */
export async function updateSyncState(updates: Partial<SyncState>): Promise<void> {
  const current = await getSyncState();
  const updated = { ...current, ...updates };
  await putToStore('sync_state', updated);
}

/**
 * Increment pending count in sync state
 */
export async function incrementPendingCount(delta: number = 1): Promise<void> {
  const state = await getSyncState();
  await updateSyncState({
    pending_count: Math.max(0, state.pending_count + delta)
  });
}

// ============ BULK OPERATIONS ============

/**
 * Bulk insert/update (for initial sync)
 */
export async function bulkPut<T extends StoreRecord>(
  storeName: StoreName,
  records: T[]
): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    records.forEach((record) => {
      store.put(record);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Cursor-based iteration (for large datasets)
 */
export async function* iterateStore<T extends StoreRecord>(
  storeName: StoreName,
  indexName?: string
): AsyncGenerator<T, void, unknown> {
  const db = await getDatabase();

  const transaction = db.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  const source = indexName ? store.index(indexName) : store;

  const cursorRequest = source.openCursor();

  while (true) {
    const cursor = await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
      cursorRequest.onsuccess = () => resolve(cursorRequest.result);
      cursorRequest.onerror = () => reject(cursorRequest.error);
    });

    if (!cursor) break;

    yield cursor.value as T;

    await new Promise<void>((resolve, reject) => {
      const continueRequest = cursor.continue();
      continueRequest.onsuccess = () => resolve();
      continueRequest.onerror = () => reject(continueRequest.error);
    });
  }
}
