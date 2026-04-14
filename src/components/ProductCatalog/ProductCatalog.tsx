/**
 * ProductCatalog - Sortly-style mobile-first product grid
 * 
 * Features:
 * - Photo-centric card layout (like Sortly)
 * - Pull-to-refresh gesture
 * - Bottom sheet for quick actions
 * - Sticky search bar
 * - Category chips for filtering
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ProductCard } from './ProductCard';
import { SortlyHeader } from './SortlyHeader';
import { CategoryFilter } from './CategoryFilter';
import { BottomSheet } from '../shared/BottomSheet';
import { useProducts } from '../../hooks/useProducts';
import { ProductWithInventory } from '../../db/operations/products';

export interface ProductCatalogProps {
  organizationId: string;
  onProductSelect?: (product: ProductWithInventory) => void;
  onScanBarcode?: () => void;
  onAddProduct?: () => void;
  onImport?: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  organizationId,
  onProductSelect,
  onScanBarcode,
  onAddProduct,
  onImport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const { products, isLoading, refresh } = useProducts(organizationId);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    let filtered = products;

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
  }, [products, selectedCategory, searchQuery]);

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

  const handleProductClick = useCallback((product: ProductWithInventory) => {
    setSelectedProduct(product);
    setIsBottomSheetOpen(true);
  }, []);

  const handleProductAction = useCallback(
    (action: 'view' | 'edit' | 'adjust' | 'history') => {
      if (!selectedProduct) return;
      
      setIsBottomSheetOpen(false);
      
      switch (action) {
        case 'view':
        case 'edit':
          onProductSelect?.(selectedProduct);
          break;
        case 'adjust':
          // TODO: Open adjustment modal
          break;
        case 'history':
          // TODO: Open history view
          break;
      }
    },
    [selectedProduct, onProductSelect]
  );

  // Pull to refresh handler
  const handlePullToRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Sortly-style Header */}
      <div className="sticky top-0 z-20">
        <SortlyHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onScanPress={onScanBarcode}
          onImport={onImport}
          onAddPress={onAddProduct}
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
        <div className="max-w-7xl mx-auto w-full p-3"
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

      {/* Bottom Sheet for Product Actions */}
      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        title={selectedProduct?.name || 'Product'}
      >
        {selectedProduct && (
          <ProductActionsSheet
            product={selectedProduct}
            onAction={handleProductAction}
          />
        )}
      </BottomSheet>
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

interface ProductActionsSheetProps {
  product: ProductWithInventory;
  onAction: (action: 'view' | 'edit' | 'adjust' | 'history') => void;
}

const ProductActionsSheet: React.FC<ProductActionsSheetProps> = ({
  product,
  onAction,
}) => (
  <div className="space-y-1">
    {/* Product Preview */}
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
      <div className="w-14 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{product.name}</p>
        <p className={`text-sm ${product.total_quantity <= product.reorder_point ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
          {product.total_quantity} in stock
          {product.total_quantity <= product.reorder_point && ' (Low)'}
        </p>
      </div>
    </div>

    {/* Action Buttons */}
    <button
      onClick={() => onAction('view')}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
    >
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      <span className="text-gray-900">View Details</span>
    </button>

    <button
      onClick={() => onAction('edit')}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
    >
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      <span className="text-gray-900">Edit Product</span>
    </button>

    <button
      onClick={() => onAction('adjust')}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
    >
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
      <span className="text-gray-900">Adjust Stock</span>
    </button>

    <button
      onClick={() => onAction('history')}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
    >
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-gray-900">View History</span>
    </button>
  </div>
);
