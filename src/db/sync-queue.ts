/**
 * Gloss Inventory - Sync Queue Manager
 *
 * Manages the queue of pending changes for background sync.
 * Handles optimistic updates and conflict detection.
 */

import {
  type SyncQueueItem,
  type SyncConflict,
  type SyncStatus,
  type StoreName,
  type StoreRecord,
  STORES,
} from './schema';
import {
  getDatabase,
  getFromStore,
  putToStore,
  queryByIndex,
  deleteFromStore,
  countStore,
  updateSyncState,
  generateLocalId,
  getDeviceId,
} from './database';

// ============ QUEUE OPERATIONS ============

/**
 * Queue a create operation
 */
export async function queueCreate<T extends StoreRecord>(
  tableName: StoreName,
  localId: string,
  data: Omit<T, 'id' | 'local_id' | 'sync_status' | 'sync_version' | 'created_at' | 'updated_at'>
): Promise<void> {
  console.log('[SyncQueue] queueCreate called:', tableName, localId.substring(0,8));
  
  const now = new Date().toISOString();
  const deviceId = getDeviceId();
  const organizationId = await getCurrentOrganizationId();

  console.log('[SyncQueue] orgId:', organizationId.substring(0,8), 'device:', deviceId.substring(0,8));

  const queueItem: SyncQueueItem = {
    id: generateLocalId(),
    device_id: deviceId,
    organization_id: organizationId,
    table_name: tableName,
    record_id: null,
    local_id: localId,
    operation: 'create',
    payload: data as Record<string, unknown>,
    sync_status: 'pending',
    attempt_count: 0,
    created_at: now,
  };

  await putToStore('sync_queue', queueItem);
  await updateSyncState({ pending_count: await getPendingCount() });
  console.log('[SyncQueue] queueCreate done:', tableName, localId.substring(0,8), 'total pending:', await getPendingCount());
}

/**
 * Queue an update operation
 */
export async function queueUpdate<T extends StoreRecord>(
  tableName: StoreName,
  localId: string,
  serverId: string | null,
  data: Partial<T>,
  version: number
): Promise<void> {
  const now = new Date().toISOString();
  const deviceId = getDeviceId();
  const organizationId = await getCurrentOrganizationId();

  // Check if there's already a pending operation for this record
  const existingQueue = await queryByIndex<SyncQueueItem>(
    'sync_queue',
    'by_local_id',
    localId
  );

  const existing = existingQueue.find(item => item.sync_status === 'pending');

  if (existing) {
    // Merge with existing pending operation
    const mergedPayload = existing.operation === 'create'
      ? { ...existing.payload, ...data }
      : { ...data }; // For updates, just take the latest

    const updatedQueue: SyncQueueItem = {
      ...existing,
      payload: mergedPayload as Record<string, unknown>,
      // Don't change created_at - keep original queue time
    };

    await putToStore('sync_queue', updatedQueue);
  } else {
    // Create new queue entry
    const queueItem: SyncQueueItem = {
      id: generateLocalId(),
      device_id: deviceId,
      organization_id: organizationId,
      table_name: tableName,
      record_id: serverId,
      local_id: localId,
      operation: serverId ? 'update' : 'create',
      payload: data as Record<string, unknown>,
      sync_status: 'pending',
      attempt_count: 0,
      created_at: now,
    };

    await putToStore('sync_queue', queueItem);
  }

  await updateSyncState({ pending_count: await getPendingCount() });
}

/**
 * Queue a delete operation
 */
export async function queueDelete(
  tableName: StoreName,
  localId: string,
  serverId: string | null
): Promise<void> {
  const now = new Date().toISOString();
  const deviceId = getDeviceId();
  const organizationId = await getCurrentOrganizationId();

  // Check for existing pending operation
  const existingQueue = await queryByIndex<SyncQueueItem>(
    'sync_queue',
    'by_local_id',
    localId
  );

  const existing = existingQueue.find(item => item.sync_status === 'pending');

  if (existing) {
    // If it was a pending create, just remove the queue item
    if (existing.operation === 'create') {
      await deleteFromStore('sync_queue', existing.id);
      await updateSyncState({ pending_count: await getPendingCount() });
      return;
    }

    // Otherwise, change to delete
    const updatedQueue: SyncQueueItem = {
      ...existing,
      operation: 'delete',
      payload: {},
    };
    await putToStore('sync_queue', updatedQueue);
  } else {
    // Create delete queue entry
    const queueItem: SyncQueueItem = {
      id: generateLocalId(),
      device_id: deviceId,
      organization_id: organizationId,
      table_name: tableName,
      record_id: serverId,
      local_id: localId,
      operation: 'delete',
      payload: {},
      sync_status: 'pending',
      attempt_count: 0,
      created_at: now,
    };

    await putToStore('sync_queue', queueItem);
  }

  await updateSyncState({ pending_count: await getPendingCount() });
}

// ============ QUEUE MANAGEMENT ============

/**
 * Get all pending queue items
 */
export async function getPendingQueue(): Promise<SyncQueueItem[]> {
  const items = await queryByIndex('sync_queue', 'by_status', 'pending');
  console.log('[SyncQueue] getPendingQueue returned:', items.length, 'items');
  console.log('[SyncQueue] Items by table:', items.reduce((acc, item) => {
    acc[item.table_name] = (acc[item.table_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>));
  return items;
}

/**
 * Get count of pending items
 */
export async function getPendingCount(): Promise<number> {
  return countStore('sync_queue', 'by_status', 'pending');
}

/**
 * Mark queue item as in progress
 */
export async function markQueueInProgress(id: string): Promise<void> {
  const item = await getFromStore<SyncQueueItem>('sync_queue', id);
  if (item) {
    item.sync_status = 'in_progress';
    await putToStore('sync_queue', item);
  }
}

/**
 * Mark queue item as completed and remove
 */
export async function markQueueCompleted(id: string): Promise<void> {
  await deleteFromStore('sync_queue', id);
  await updateSyncState({ pending_count: await getPendingCount() });
}

/**
 * Mark queue item as failed with error
 */
export async function markQueueFailed(
  id: string,
  error: string
): Promise<void> {
  const item = await getFromStore<SyncQueueItem>('sync_queue', id);
  if (item) {
    item.sync_status = 'failed';
    item.last_error = error;
    item.attempt_count = (item.attempt_count || 0) + 1;
    await putToStore('sync_queue', item);
  }
}

/**
 * Retry failed queue items
 */
export async function retryFailedQueue(): Promise<number> {
  const failed = await queryByIndex<SyncQueueItem>('sync_queue', 'by_status', 'failed');

  for (const item of failed) {
    if (item.attempt_count < 5) {
      item.sync_status = 'pending';
      item.last_error = undefined;
      await putToStore('sync_queue', item);
    }
  }

  const newPendingCount = await getPendingCount();
  await updateSyncState({ pending_count: newPendingCount });

  return failed.length;
}

// ============ CONFLICT MANAGEMENT ============

/**
 * Record a sync conflict
 */
export async function recordConflict(
  tableName: StoreName,
  localId: string,
  serverId: string | undefined,
  serverData: Record<string, unknown>,
  clientData: Record<string, unknown>
): Promise<SyncConflict> {
  const organizationId = await getCurrentOrganizationId();

  const conflict: SyncConflict = {
    id: generateLocalId(),
    organization_id: organizationId,
    table_name: tableName,
    record_id: serverId,
    local_id: localId,
    server_data: serverData,
    client_data: clientData,
    resolution: 'pending',
    created_at: new Date().toISOString(),
  };

  await putToStore('sync_conflicts', conflict);
  return conflict;
}

/**
 * Get all pending conflicts
 */
export async function getPendingConflicts(): Promise<SyncConflict[]> {
  return queryByIndex('sync_conflicts', 'by_status', 'pending');
}

/**
 * Resolve a conflict
 */
export async function resolveConflict(
  conflictId: string,
  resolution: 'server_wins' | 'client_wins' | 'merged',
  userId: string
): Promise<void> {
  const conflict = await getFromStore<SyncConflict>('sync_conflicts', conflictId);
  if (!conflict) return;

  conflict.resolution = resolution;
  conflict.resolved_by = userId;
  conflict.resolved_at = new Date().toISOString();

  await putToStore('sync_conflicts', conflict);

  // Apply resolution
  if (resolution === 'server_wins' && conflict.server_data) {
    // Update local record with server data
    await applyServerData(conflict.table_name as StoreName, conflict.local_id, conflict.server_data);
  }
  // client_wins: do nothing, client data already in place
  // merged: would need custom merge logic
}

// ============ HELPER FUNCTIONS ============

/**
 * Get current organization ID from sync state
 */
async function getCurrentOrganizationId(): Promise<string> {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_state', 'readonly');
      const store = transaction.objectStore('sync_state');
      const request = store.get('current');

      request.onsuccess = () => {
        const state = request.result;
        if (state?.organization_id) {
          resolve(state.organization_id);
        } else {
          // Fall back to localStorage
          const localOrg = localStorage.getItem('organization_id') || '';
          resolve(localOrg);
        }
      };
      request.onerror = () => {
        // Fall back to localStorage on error
        const localOrg = localStorage.getItem('organization_id') || '';
        resolve(localOrg);
      };
    });
  } catch {
    // Fall back to localStorage if database fails
    return localStorage.getItem('organization_id') || '';
  }
}

/**
 * Apply server data to local record
 */
async function applyServerData(
  tableName: StoreName,
  localId: string,
  serverData: Record<string, unknown>
): Promise<void> {
  const storeName = tableName as keyof typeof STORES;

  // Get existing local record
  const existing = await getFromStore<StoreRecord>(storeName, localId);
  if (!existing) return;

  // Merge server data while preserving local_id
  const merged = {
    ...existing,
    ...serverData,
    local_id: localId,
    id: serverData.id as string | null,
    sync_status: 'synced' as SyncStatus,
    updated_at: new Date().toISOString(),
  };

  await putToStore(storeName, merged);
}

// ============ BULK SYNC OPERATIONS ============

/**
 * Process batch of server changes
 */
export async function applyServerChanges(
  changes: Array<{
    table: StoreName;
    operation: 'create' | 'update' | 'delete';
    server_id: string;
    local_id?: string;
    data?: Record<string, unknown>;
  }>
): Promise<void> {
  for (const change of changes) {
    const storeName = change.table;

    if (change.operation === 'delete') {
      // Find by server_id and delete
      // Note: Need to query to find local_id first
      const records = await queryByIndex<StoreRecord>(storeName, 'by_id', change.server_id);
      if (records.length > 0) {
        await deleteFromStore(storeName, records[0].local_id);
      }
    } else {
      // Create or update
      const data = change.data || {};
      const localId = change.local_id || (await findLocalIdByServerId(storeName, change.server_id));

      if (localId) {
        // Update existing
        const existing = await getFromStore<StoreRecord>(storeName, localId);
        if (existing) {
          const merged = {
            ...existing,
            ...data,
            id: change.server_id,
            sync_status: 'synced' as SyncStatus,
            updated_at: new Date().toISOString(),
          };
          await putToStore(storeName, merged);
        } else {
          // Server provided local_id but record doesn't exist locally yet - CREATE it
          const newRecord = {
            ...data,
            id: change.server_id,
            local_id: localId,
            sync_status: 'synced',
            sync_version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as StoreRecord;
          await putToStore(storeName, newRecord);
        }
      } else {
        // Create new with server-provided local_id or generate
        const newLocalId = change.local_id || generateLocalId();
        const newRecord = {
          ...data,
          id: change.server_id,
          local_id: newLocalId,
          sync_status: 'synced',
          sync_version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as StoreRecord;
        await putToStore(storeName, newRecord);
      }
    }
  }
}

/**
 * Find local_id by server id (for applying server changes)
 */
async function findLocalIdByServerId(
  storeName: keyof typeof STORES,
  serverId: string
): Promise<string | null> {
  // Query all records and find by id
  // This is inefficient but works for now
  // Better: add index on id field for stores that need it
  const { getAllFromStore } = await import('./database');
  const records = await getAllFromStore<StoreRecord>(storeName);
  const match = records.find(r => r.id === serverId);
  return match?.local_id || null;
}
