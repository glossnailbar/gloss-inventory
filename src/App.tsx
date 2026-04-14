/**
 * Gloss Inventory - Main App Component
 * 
 * Features:
 * - URL-based routing for each item page
 * - Sidebar navigation with locations
 * - Item detail page has own URL (/#/item/:id)
 * - Refresh preserves current page
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ProductCatalog } from './components/ProductCatalog/ProductCatalog';
import { ProductDetail } from './components/ProductDetail/ProductDetail';
import { BarcodeScanner } from './components/BarcodeScanner/BarcodeScanner';
import { AddProductModal } from './components/AddProductModal/AddProductModal';
import { ImportSortlyModal } from './components/ImportSortly/ImportSortlyModal';
import { Sidebar } from './components/Sidebar/Sidebar';
import { LocationManager } from './components/Locations/LocationManager';
import { ProductWithInventory, getProductWithInventory } from './db/operations/products';
import { scanBarcode } from './db/operations/barcode';
import { initDatabase, getSyncState, deleteDatabase } from './db/database';

// Demo organization ID for testing
const DEMO_ORG_ID = 'demo-gloss-heights';

// Parse current URL hash
const parseHash = (): { view: string; itemId?: string } => {
  const hash = window.location.hash.slice(1) || '/';
  
  // Match /item/:id
  const itemMatch = hash.match(/^\/item\/(.*)$/);
  if (itemMatch) {
    return { view: 'item', itemId: itemMatch[1] };
  }
  
  // Match other routes
  if (hash === '/scanner') return { view: 'scanner' };
  if (hash === '/add') return { view: 'add' };
  
  return { view: 'catalog' };
};

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('catalog');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<{
    pendingCount: number;
    lastSync: string | null;
    isSyncing: boolean;
  }>({ pendingCount: 0, lastSync: null, isSyncing: false });
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isLocationManagerOpen, setIsLocationManagerOpen] = useState(false);

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

  // Handle URL hash changes
  useEffect(() => {
    const handleHashChange = async () => {
      const { view, itemId } = parseHash();
      setCurrentView(view);
      
      if (view === 'item' && itemId) {
        // Load product from URL
        try {
          const product = await getProductWithInventory(itemId);
          setSelectedProduct(product || null);
        } catch (err) {
          console.error('Failed to load product:', err);
          setSelectedProduct(null);
        }
      } else {
        setSelectedProduct(null);
      }
    };

    // Initial load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'TRIGGER_SYNC' });
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'sync-complete') {
        setSyncStatus((prev) => ({
          ...prev,
          pendingCount: Math.max(0, prev.pendingCount - event.data.processed),
          isSyncing: false,
        }));
      } else if (event.data?.type === 'sync-error') {
        setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
      } else if (event.data?.type === 'sync-started') {
        setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Navigation handlers - update URL hash
  const handleProductSelect = useCallback((product: ProductWithInventory) => {
    window.location.hash = `#/item/${product.local_id}`;
  }, []);

  const handleBackToCatalog = useCallback(() => {
    window.location.hash = '#/';
  }, []);

  const handleViewAll = useCallback(() => {
    setSelectedLocation(null);
    window.location.hash = '#/';
  }, []);

  const handleScanBarcode = useCallback(() => {
    window.location.hash = '#/scanner';
  }, []);

  const handleAddProduct = useCallback(() => {
    window.location.hash = '#/add';
  }, []);

  const handleScanComplete = useCallback(async (barcode: string) => {
    const result = await scanBarcode(DEMO_ORG_ID, barcode);
    if (result) {
      window.location.hash = `#/item/${result.product.local_id}`;
    } else {
      window.location.hash = '#/add';
    }
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
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Initialization Failed</h2>
          <p className="text-gray-600 mb-4">{initError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-rose-500 text-white rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Determine what to show
  const isItemPage = currentView === 'item' && selectedProduct;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Offline / Sync Status Bar */}
      <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-sm font-medium text-center transition-colors ${
        !isOnline ? 'bg-amber-500 text-white' : 
        syncStatus.isSyncing ? 'bg-green-500 text-white' : 
        syncStatus.pendingCount > 0 ? 'bg-blue-500 text-white' : 'hidden'
      }`}>
        {!isOnline ? 'Offline Mode' : syncStatus.isSyncing ? `Syncing ${syncStatus.pendingCount} items...` : 
         syncStatus.pendingCount > 0 ? (
          <span>{syncStatus.pendingCount} changes pending 
            <button onClick={() => navigator.serviceWorker?.controller?.postMessage({ type: 'TRIGGER_SYNC' })} 
              className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">Sync Now</button>
          </span>
        ) : null}
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-md md:hidden"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Main Layout */}
      <div className="flex min-h-screen">
        {/* Sidebar - Hidden on item page on mobile */}
        <div className={`${isItemPage ? 'hidden md:block' : ''}`}>
          <Sidebar
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
            onViewAll={handleViewAll}
            onManageLocations={() => setIsLocationManagerOpen(true)}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>

        {/* Main Content */}
        <main className={`flex-1 ${!isOnline || syncStatus.pendingCount > 0 ? 'pt-10' : ''}`}>
          {/* Item Detail Page - Full width, no padding */}
          {isItemPage ? (
            <ProductDetail
              product={selectedProduct}
              onBack={handleBackToCatalog}
              onDelete={handleBackToCatalog}
              onLocationSelect={(locationId) => {
                setSelectedLocation(locationId);
                window.location.hash = '#/';
              }}
            />
          ) : currentView === 'scanner' ? (
            <div className="p-4 md:p-6 lg:p-8">
              <BarcodeScanner onScan={handleScanComplete} onClose={() => window.location.hash = '#/'} />
            </div>
          ) : currentView === 'add' ? (
            <div className="p-4 md:p-6 lg:p-8">
              <AddProductModal
                organizationId={DEMO_ORG_ID}
                onClose={() => window.location.hash = '#/'}
                onSuccess={() => window.location.hash = '#/'}
              />
            </div>
          ) : (
            /* Catalog View */
            <div className="p-4 md:p-6 lg:p-8">
              {/* Page Title */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedLocation ? 'Location Items' : 'All Items'}
                </h1>
                <p className="text-gray-500">
                  {selectedLocation ? `Viewing items in ${selectedLocation}` : 'Viewing all inventory items'}
                </p>
              </div>

              <ProductCatalog
                organizationId={DEMO_ORG_ID}
                selectedLocation={selectedLocation}
                onProductSelect={handleProductSelect}
                onScanBarcode={handleScanBarcode}
                onAddProduct={handleAddProduct}
                onImport={() => setIsImportModalOpen(true)}
                onClearData={async () => {
                  if (!confirm('Clear all data?')) return;
                  await deleteDatabase();
                  window.location.reload();
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* Import Modal */}
      <ImportSortlyModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={async (products, categories, vendors, locations) => {
          console.log('Importing', products.length, 'products,', categories.length, 'categories,', vendors.length, 'vendors,', locations.length, 'locations');
          
          try {
            // Create categories
            const { createCategory } = await import('./db/operations/categories');
            const categoryMap = new Map<string, string>();
            
            for (const cat of categories) {
              try {
                const newCat = await createCategory({
                  name: cat.name,
                  organization_id: DEMO_ORG_ID,
                });
                categoryMap.set(cat.name, newCat.local_id);
              } catch (err) {
                console.error('Failed to create category:', cat.name, err);
              }
            }
            
            // Create vendors
            const { createVendor } = await import('./db/operations/vendors');
            const vendorMap = new Map<string, string>();
            
            for (const vendor of vendors) {
              try {
                const newVendor = await createVendor({
                  name: vendor.name,
                  organization_id: DEMO_ORG_ID,
                });
                vendorMap.set(vendor.name, newVendor.local_id);
              } catch (err) {
                console.error('Failed to create vendor:', vendor.name, err);
              }
            }
            
            // Create products with location info
            const { createProduct } = await import('./db/operations/products');
            
            let importedCount = 0;
            
            for (const product of products) {
              try {
                const categoryId = categoryMap.get(product.folder) || null;
                const vendorId = product.vendor ? vendorMap.get(product.vendor) : undefined;
                
                // Use Sortly location or default
                const locationId = product.location || 'default';
                
                console.log('Creating product:', product.name, 'qty:', product.quantity, 'location:', locationId);
                
                await createProduct({
                  name: product.name,
                  organization_id: DEMO_ORG_ID,
                  category_id: categoryId,
                  vendor_id: vendorId,
                  description: product.description,
                  sku: product.sku,
                  barcode: product.barcode,
                  unit_of_measure: product.unit_of_measure || 'piece',
                  reorder_point: product.reorder_point || 0,
                  reorder_quantity: product.max_level || 0,
                  max_level: product.max_level,
                  unit_cost: product.unit_cost,
                  purchase_link: product.purchase_link,
                  brand: product.brand,
                  origin: product.origin,
                  tags: product.tags,
                  item_size: product.item_size,
                  price_per: product.price_per,
                  pcs_per_box: product.pcs_per_box,
                  attribute1_name: product.attribute1_name,
                  attribute1_value: product.attribute1_value,
                  attribute2_name: product.attribute2_name,
                  attribute2_value: product.attribute2_value,
                  attribute3_name: product.attribute3_name,
                  attribute3_value: product.attribute3_value,
                  image_url: product.image_url,
                  image_url2: product.image_url2,
                  image_url3: product.image_url3,
                }, product.quantity > 0 ? [{ location_id: locationId, quantity: product.quantity }] : undefined);
                
                importedCount++;
              } catch (err) {
                console.error('Failed to import product:', product.name, err);
              }
            }
            
            console.log(`Successfully imported ${importedCount} products`);
            window.location.reload();
            
          } catch (err) {
            console.error('Import failed:', err);
          }
          
          setIsImportModalOpen(false);
        }}
      />

      {/* Location Manager Modal */}
      <LocationManager
        organizationId={DEMO_ORG_ID}
        isOpen={isLocationManagerOpen}
        onClose={() => setIsLocationManagerOpen(false)}
        onLocationsUpdated={() => {
          // Trigger a refresh - the sidebar will reload locations
          window.location.reload();
        }}
      />
    </div>
  );
};

export default App;
