/**
 * ProductCard - Sortly-style photo card
 * 
 * Features:
 * - Large square photo (like Sortly)
 * - Clean white card with subtle shadow
 * - Stock indicator dot
 * - Minimal text
 */

import React from 'react';
import { ProductWithInventory } from '../../db/operations/products';

export interface ProductCardProps {
  product: ProductWithInventory;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onClick,
}) => {
  const stockColor = getStockColor(product.total_quantity, product.reorder_point);
  const stockLabel = getStockLabel(product.total_quantity, product.reorder_point);

  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 overflow-hidden transition-all duration-200 active:scale-[0.98] text-left"
    >
      {/* Photo - Square aspect ratio */}
      <div className="relative aspect-square bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-300">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">No photo</span>
          </div>
        )}

        {/* Stock indicator dot */}
        <div 
          className={`absolute top-3 right-3 w-3 h-3 rounded-full border-2 border-white shadow-sm ${stockColor}`}
          title={stockLabel}
        />
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2 mb-1">
          {product.name}
        </h3>
        
        <p className="text-sm text-gray-500">
          {product.total_quantity === 0 ? (
            <span className="text-red-600 font-medium">Out of stock</span>
          ) : product.total_quantity <= product.reorder_point ? (
            <span className="text-amber-600 font-medium">{product.total_quantity} left</span>
          ) : (
            <span>{product.total_quantity} in stock</span>
          )}
        </p>
      </div>
    </button>
  );
};

function getStockColor(qty: number, reorderPoint: number): string {
  if (qty === 0) return 'bg-red-500';
  if (qty <= reorderPoint) return 'bg-amber-500';
  return 'bg-green-500';
}

function getStockLabel(qty: number, reorderPoint: number): string {
  if (qty === 0) return 'Out of stock';
  if (qty <= reorderPoint) return 'Low stock';
  return 'In stock';
}
