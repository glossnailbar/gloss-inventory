/**
 * ProductCatalog - Sortly-style mobile-first product grid
 * 
 * Features:
 * - Photo-centric card layout (like Sortly)
 * - Click goes directly to item detail page
 * - Sticky search bar
 * - Category chips for filtering
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ProductCard } from './ProductCard';
import { SimpleHeader } from './SimpleHeader';
import { CategoryFilter } from './CategoryFilter';
import { useProducts } from '../../hooks/useProducts';
import { ProductWithInventory } from '../../db/operations/products';

export interface ProductCatalogProps {
  organizationId: string;
  selectedLocation?: string | null;
  onProductSelect?: (product: ProductWithInventory) => void;
  onScanBarcode?: () => void;
  onAddProduct?: () => void;
  onImport?: () => void;
  onClearData?: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  organizationId,
  selectedLocation,
  onProductSelect,
  onScanBarcode,
  onAddProduct,
  onImport,
  onClearData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { products, isLoading, refresh } = useProducts(organizationId);

  // Refresh products when sync completes
  useEffect(() => {
    const handleSyncCompleted = () => {
      console.log('[ProductCatalog] Sync completed, refreshing products...');
      refresh();
    };
    
    window.addEventListener('sync-completed', handleSyncCompleted);
    return () => window.removeEventListener('sync-completed', handleSyncCompleted);
  }, [refresh]);

  // Filter products based on search, category, and location
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Location filter
    // Location filter (sidebar "locations" are actually categories)
    if (selectedLocation) {
      filtered = filtered.filter((p) => p.category_id === selectedLocation);
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    // Search filter (name, SKU, barcode)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.barcode?.includes(query)
      );
    }

    return filtered;
  }, [products, selectedCategory, selectedLocation, searchQuery]);

  // Group products by category for display
  const groupedProducts = useMemo(() => {
    const groups: Record<string, ProductWithInventory[]> = {};
    
    filteredProducts.forEach((product) => {
      const categoryId = product.category_id || 'uncategorized';
      if (!groups[categoryId]) {
        groups[categoryId] = [];
      }
      groups[categoryId].push(product);
    });

    return groups;
  }, [filteredProducts]);

  // Click goes directly to item detail
  const handleProductClick = useCallback((product: ProductWithInventory) => {
    onProductSelect?.(product);
  }, [onProductSelect]);

  // Pull to refresh handler
  const handlePullToRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-20">
        <SimpleHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onScanPress={onScanBarcode}
          onImport={onImport}
          onAddPress={onAddProduct}
          onClearData={onClearData}
          itemCount={filteredProducts.length}
        />
        
        {/* Category Filter - Horizontal scrollable */}
        <div className="bg-white border-b border-gray-100">
          <CategoryFilter
            organizationId={organizationId}
            selectedId={selectedCategory}
            onSelect={setSelectedCategory}
            className="px-4 py-2"
          />
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full p-3">
          {isLoading ? (
            <LoadingState />
          ) : filteredProducts.length === 0 ? (
            <EmptyState 
              hasSearch={!!searchQuery}
              onAddProduct={onAddProduct}
            />
          ) : (
            <div className="space-y-8 pb-24">
              {Object.entries(groupedProducts).map(([categoryId, categoryProducts]) => (
                <section key={categoryId} className="space-y-3">
                  {/* Category Header */}
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 px-1">
                    {categoryProducts[0]?.category_name || 'Uncategorized'}
                    <span className="text-gray-400 font-normal">
                      ({categoryProducts.length})
                    </span>
                  </h2>

                  {/* Product Grid - Mobile: 2 columns, Tablet: 3, Desktop: 4, Large: 5 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {categoryProducts.map((product) => (
                      <ProductCard
                        key={product.local_id}
                        product={product}
                        onClick={() => handleProductClick(product)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Bottom padding for FAB */}
        <div className="h-20" />
      </div>

      {/* Floating Action Button */}
      <button
        onClick={onAddProduct}
        className="fixed bottom-4 right-4 w-14 h-14 bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-rose-600 active:scale-95 transition-all z-30"
        aria-label="Add product"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
};

// Sub-components

const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="w-10 h-10 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin mb-4" />
    <p className="text-gray-500">Loading items...</p>
  </div>
);

interface EmptyStateProps {
  hasSearch: boolean;
  onAddProduct?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasSearch, onAddProduct }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center px-4">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-1">
      {hasSearch ? 'No items found' : 'No items yet'}
    </h3>
    <p className="text-gray-500 mb-6 max-w-xs">
      {hasSearch 
        ? 'Try adjusting your search terms'
        : 'Get started by adding your first item or importing from Sortly'
      }
    </p>
    
    {!hasSearch && onAddProduct && (
      <button
        onClick={onAddProduct}
        className="px-6 py-3 bg-rose-500 text-white rounded-full font-medium hover:bg-rose-600 transition-colors shadow-sm"
      >
        Add First Item
      </button>
    )}
  </div>
);
