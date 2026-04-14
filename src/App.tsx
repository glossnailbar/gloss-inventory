/**
 * Gloss Inventory - Main App Component
 * 
 * Wires together all components for local testing.
 * Handles routing, offline detection, and sync status.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ProductCatalog } from './components/ProductCatalog/ProductCatalog';
import { ProductDetail } from './components/ProductDetail/ProductDetail';
import { BarcodeScanner } from './components/BarcodeScanner/BarcodeScanner';
import { AddProductModal } from './components/AddProductModal/AddProductModal';
import { ImportSortlyModal } from './components/ImportSortly/ImportSortlyModal';
import { ProductWithInventory } from './db/operations/products';
import { scanBarcode } from './db/operations/barcode';
import { initDatabase, getSyncState, updateSyncState } from './db/database';

type View = 'catalog' | 'detail' | 'scanner' | 'add-product';

interface ImportProduct {
  local_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  description: string | null;
  location: string;
  unit_of_measure: string;
  cost_method: string;
  reorder_point: number;
}

// Demo organization ID for testing
const DEMO_ORG_ID = 'demo-gloss-heights';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('catalog');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<{
    pendingCount: number;
    lastSync: string | null;
    isSyncing: boolean;
  }>({ pendingCount: 0, lastSync: null, isSyncing: false });
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize database on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        
        // Load initial sync state
        const state = await getSyncState();
        setSyncStatus({
          pendingCount: state.pending_count,
          lastSync: state.last_sync_at || null,
          isSyncing: state.is_syncing,
        });
        
        setIsInitialized(true);
      } catch (err) {
        setInitError(err instanceof Error ? err.message : 'Failed to initialize');
      }
    };

    init();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming online
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'TRIGGER_SYNC' });
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync updates from service worker
    const handleMessage = (event: MessageEvent) => {
      console.log('[App] Message from SW:', event.data);
      
      if (event.data?.type === 'sync-complete') {
        console.log('[App] Sync complete:', event.data.processed, 'items');
        setSyncStatus((prev) => ({
          ...prev,
          pendingCount: Math.max(0, prev.pendingCount - event.data.processed),
          isSyncing: false,
        }));
      } else if (event.data?.type === 'sync-error') {
        console.error('[App] Sync error:', event.data.error);
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          error: event.data.error,
        }));
      } else if (event.data?.type === 'sync-started') {
        console.log('[App] Sync started');
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: true,
        }));
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Navigation handlers
  const handleProductSelect = useCallback((product: ProductWithInventory) => {
    setSelectedProduct(product);
    setCurrentView('detail');
  }, []);

  const handleBackToCatalog = useCallback(() => {
    setSelectedProduct(null);
    setCurrentView('catalog');
  }, []);

  const handleScanBarcode = useCallback(() => {
    setCurrentView('scanner');
  }, []);

  const handleAddProduct = useCallback(() => {
    setCurrentView('add-product');
  }, []);

  const handleScanComplete = useCallback(
    async (barcode: string) => {
      // Try to find product by barcode
      const result = await scanBarcode(DEMO_ORG_ID, barcode);

      if (result) {
        // Found product - show detail
        const { getProductWithInventory } = await import('./db/operations/products');
        const product = await getProductWithInventory(result.product.local_id);
        if (product) {
          setSelectedProduct(product);
          setCurrentView('detail');
          return;
        }
      }

      // No product found - go to add product with barcode pre-filled
      setCurrentView('add-product');
      // TODO: Pass barcode to add product modal
    },
    []
  );

  const handleAddProductSuccess = useCallback(() => {
    setCurrentView('catalog');
  }, []);

  // Loading state
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Initializing Gloss Inventory...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Initialization Failed</h2>
          <p className="text-gray-600 mb-4">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline / Sync Status Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-sm font-medium text-center transition-colors ${
          !isOnline
            ? 'bg-amber-500 text-white'
            : syncStatus.isSyncing
            ? 'bg-green-500 text-white'
            : syncStatus.pendingCount > 0
            ? 'bg-blue-500 text-white'
            : 'hidden'
        }`}
      >
        {!isOnline ? (
          'Offline Mode - Changes will sync when online'
        ) : syncStatus.isSyncing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Syncing {syncStatus.pendingCount} items to server...
          </span>
        ) : syncStatus.pendingCount > 0 ? (
          <span className="flex items-center justify-center gap-2">
            {syncStatus.pendingCount} changes pending
            <button 
              onClick={() => {
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                  navigator.serviceWorker.controller.postMessage({ type: 'TRIGGER_SYNC' });
                }
              }}
              className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs"
            >
              Sync Now
            </button>
          </span>
        ) : null}
      </div>

      {/* Main Content - Centered on Desktop */}
      <div className={`mx-auto w-full max-w-7xl ${!isOnline || syncStatus.pendingCount > 0 ? 'pt-10' : ''}`}>
        {currentView === 'catalog' && (
          <ProductCatalog
            organizationId={DEMO_ORG_ID}
            onProductSelect={handleProductSelect}
            onScanBarcode={handleScanBarcode}
            onAddProduct={handleAddProduct}
            onImport={() => setIsImportModalOpen(true)}
          />
        )}

        {currentView === 'detail' && selectedProduct && (
          <ProductDetail
            product={selectedProduct}
            onBack={handleBackToCatalog}
            onEdit={(p) => {
              // TODO: Open edit modal
              console.log('Edit:', p);
            }}
            onDelete={handleBackToCatalog}
          />
        )}

        {currentView === 'scanner' && (
          <BarcodeScanner
            onScan={handleScanComplete}
            onClose={() => setCurrentView('catalog')}
          />
        )}

        {currentView === 'add-product' && (
          <AddProductModal
            organizationId={DEMO_ORG_ID}
            onClose={() => setCurrentView('catalog')}
            onSuccess={handleAddProductSuccess}
          />
        )}
      </div>

      {/* Import Sortly Modal */}
      <ImportSortlyModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={async (products) => {
          // Import products to IndexedDB
          console.log('Importing', products.length, 'products');
          
          try {
            const { createProduct } = await import('./db/operations/products');
            
            let importedCount = 0;
            
            for (const product of products) {
              try {
                // Create product in IndexedDB - pass object with organization_id
                await createProduct({
                  name: product.name,
                  organization_id: DEMO_ORG_ID,
                  category_id: 'uncategorized', // Use a default category ID
                  description: product.description,
                  sku: product.sku,
                  barcode: product.barcode,
                  unit_of_measure: product.unit_of_measure || 'piece',
                  reorder_point: product.reorder_point || 0,
                }, product.quantity > 0 ? [{ location_id: 'default', quantity: product.quantity }] : undefined);
                
                importedCount++;
              } catch (err) {
                console.error('Failed to import product:', product.name, err);
              }
            }
            
            console.log(`Successfully imported ${importedCount} products`);
            
            // Force refresh the product list
            window.location.reload();
            
          } catch (err) {
            console.error('Import failed:', err);
          }
          
          setIsImportModalOpen(false);
        }}
      />
    </div>
  );
};

export default App;
