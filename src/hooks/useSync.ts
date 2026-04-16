/**
 * useSync - React hook for syncing with Railway backend
 *
 * Handles online/offline detection and sync status.
 */

import { useState, useEffect, useCallback } from 'react';
import { getPendingCount, getPendingQueue } from '../db/sync-queue';
import { checkHealth, pushChanges, pullChanges } from '../api/client';
import { getAuthToken } from '../api/auth';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: string | null;
  error: string | null;
}

export function useSync(organizationId: string) {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    error: null,
  });

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setStatus((prev) => ({ ...prev, pendingCount: count }));
  }, []);

  // Check server health
  const checkConnection = useCallback(async () => {
    try {
      const health = await checkHealth();
      setStatus((prev) => ({
        ...prev,
        isOnline: !!health,
        error: health ? null : prev.error,
      }));
      return !!health;
    } catch {
      setStatus((prev) => ({ ...prev, isOnline: false }));
      return false;
    }
  }, []);

  // Trigger sync
  const sync = useCallback(async () => {
    if (status.isSyncing) return;

    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      // Check connection first
      const isConnected = await checkConnection();
      if (!isConnected) {
        throw new Error('No connection to server');
      }

      // Get pending changes
      const pending = await getPendingQueue();
      console.log('[Sync] Pending changes:', pending.length);

      if (pending.length > 0) {
        // Push changes directly via API
        const deviceId = 'web-' + Math.random().toString(36).slice(2, 11);
        
        // Filter to only tables that exist on server
        const validTables = ['products', 'categories', 'vendors', 'locations', 'inventory_levels'];
        const validChanges = pending
          .filter(item => validTables.includes(item.table_name))
          .map(item => ({
            local_id: item.local_id,
            table: item.table_name,
            operation: item.operation,
            data: item.payload,
            client_timestamp: item.created_at,
            client_version: item.sync_version || 1,
          }));

        console.log('[Sync] Pending:', pending.length, 'Valid:', validChanges.length);
        
        if (validChanges.length === 0) {
          console.log('[Sync] No valid changes to push');
        } else {
          console.log('[Sync] Pushing changes:', validChanges.length);
          const result = await pushChanges(deviceId, organizationId, validChanges);
          console.log('[Sync] Push result:', result);
        }
      }

      // Pull changes from server
      console.log('[Sync] Pulling changes from server...');
      const pulled = await pullChanges(organizationId, 0);
      console.log('[Sync] Pulled:', pulled);

      // Update last sync time
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date().toISOString(),
        pendingCount: 0,
      }));
      
      console.log('[Sync] Complete!');
    } catch (err) {
      console.error('[Sync] Error:', err);
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      }));
    }
  }, [status.isSyncing, checkConnection, organizationId]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
      sync(); // Auto-sync when coming online
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sync]);

  // Periodic health check
  useEffect(() => {
    const interval = setInterval(() => {
      checkConnection();
      updatePendingCount();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [checkConnection, updatePendingCount]);

  // Initial check
  useEffect(() => {
    checkConnection();
    updatePendingCount();
  }, [checkConnection, updatePendingCount]);

  return {
    ...status,
    sync,
    checkConnection,
    updatePendingCount,
  };
}
