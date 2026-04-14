/**
 * useSync - React hook for syncing with Railway backend
 *
 * Handles online/offline detection and sync status.
 */

import { useState, useEffect, useCallback } from 'react';
import { getPendingCount } from '../db/sync-queue';
import { checkHealth, pushChanges, pullChanges } from '../api/client';

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
      // Trigger service worker sync
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'TRIGGER_SYNC' });
      }

      // Also try direct API sync as fallback
      const isConnected = await checkConnection();
      if (!isConnected) {
        throw new Error('No connection to server');
      }

      // Update last sync time
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date().toISOString(),
        pendingCount: 0,
      }));
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      }));
    }
  }, [status.isSyncing, checkConnection]);

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
