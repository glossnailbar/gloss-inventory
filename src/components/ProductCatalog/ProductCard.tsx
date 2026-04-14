/**
 * ProductCard - Photo-centric product display (Sortly-style)
 * 
 * Mobile-optimized with large touch targets and visual stock indicator.
 */

import React from 'react';
import { ProductWithInventory } from '../../db/operations/products';

export interface ProductCardProps {
  product: ProductWithInventory;
  onClick?: () => void;
  showStockWarning?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onClick,
  showStockWarning = false,
}) => {
  // Determine stock status color
  const stockStatus = useStockStatus(product);

  return (
    <button
      onClick={onClick}
      className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-rose-300 hover:shadow-md transition-all active:scale-[0.98] text-left"
    >
      {/* Image Container - Square aspect ratio like Sortly */}
      <div className="relative aspect-square bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Stock Indicator Badge */}
        <div
          className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-white shadow-sm ${stockStatus.color}`}
          title={stockStatus.label}
        />

        {/* Low Stock Warning */}
        {showStockWarning && (
          <div className="absolute inset-x-0 bottom-0 bg-amber-500/90 text-white text-xs font-medium py-1 px-2 text-center">
            Low Stock
          </div>
        )}

        {/* Professional-only badge */}
        {product.is_professional_only && (
          <div className="absolute top-2 left-2 bg-gray-900/70 text-white text-[10px] font-medium px-2 py-0.5 rounded">
            PRO
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Quantity indicator */}
        <div className="flex items-center justify-between mt-2">
          <span
            className={`text-xs font-medium ${
              product.total_quantity === 0
                ? 'text-red-600'
                : product.total_quantity <= product.reorder_point
                ? 'text-amber-600'
                : 'text-green-600'
            }`}
          >
            {product.total_quantity === 0
              ? 'Out of stock'
              : `${product.total_quantity} ${product.unit_of_measure}`}
          </span>

          {/* Variant indicator */}
          {product.variants && product.variants.length > 0 && (
            <span className="text-xs text-gray-400">
              {product.variants.length} variants
            </span>
          )}
        </div>

        {/* Location summary (if multiple) */}
        {product.inventory.length > 1 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {product.inventory.slice(0, 3).map((level) => (
              <span
                key={level.location_id}
                className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
              >
                {getLocationAbbreviation(level.location_id)}: {level.quantity_on_hand}
              </span>
            ))}
            {product.inventory.length > 3 && (
              <span className="text-[10px] text-gray-400">+{product.inventory.length - 3} more</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

// Helper for stock status color
function useStockStatus(product: ProductWithInventory) {
  if (product.total_quantity === 0) {
    return { color: 'bg-red-500', label: 'Out of stock' };
  }
  if (product.total_quantity <= product.reorder_point) {
    return { color: 'bg-amber-500', label: 'Low stock' };
  }
  return { color: 'bg-green-500', label: 'In stock' };
}

// Helper for location abbreviation
function getLocationAbbreviation(locationId: string): string {
  // Map location IDs to abbreviations
  // This would ideally come from a location lookup
  const abbreviations: Record<string, string> = {
    'front-desk': 'FD',
    'back-bar': 'BB',
    'storage': 'STOR',
  };
  return abbreviations[locationId] || locationId.slice(0, 4).toUpperCase();
}
