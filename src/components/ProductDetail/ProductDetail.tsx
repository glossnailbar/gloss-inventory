/**
 * ProductDetail - Full product view/edit screen
 * 
 * Responsive: Mobile-optimized with desktop improvements.
 */

import React, { useState, useCallback } from 'react';
import { ProductWithInventory, deleteProduct } from '../../db/operations/products';
import { InventoryAdjustmentModal } from '../InventoryAdjustment/InventoryAdjustmentModal';
import { EditProductModal } from './EditProductModal';

export interface ProductDetailProps {
  product: ProductWithInventory;
  onBack: () => void;
  onEdit?: (product: ProductWithInventory) => void;
  onDelete?: () => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  onBack,
  onEdit,
  onDelete,
}) => {
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'history'>('overview');

  const handleDelete = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(product.local_id);
      onDelete?.();
    }
  }, [product.local_id, onDelete]);

  return (
    <div className="min-h-screen bg-gray-50 md:bg-gray-100">
      {/* Desktop Container */}
      <div className="max-w-4xl mx-auto md:py-8">
        {/* Card for desktop */}
        <div className="bg-white md:rounded-2xl md:shadow-lg md:min-h-[80vh]">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200 md:rounded-t-2xl">
            <div className="flex items-center justify-between px-4 py-3 md:px-6">
              <button
                onClick={onBack}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900 md:hover:bg-gray-100 md:rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="font-semibold text-gray-900 truncate flex-1 text-center md:text-lg">Product Details</h1>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="p-2 -mr-2 text-rose-500 hover:text-rose-600 md:hover:bg-rose-50 md:rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content - Two column layout on desktop */}
          <div className="md:grid md:grid-cols-2">
            {/* Left: Image */}
            <div className="aspect-square md:aspect-auto md:h-full bg-gray-100 relative md:rounded-bl-2xl">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover md:rounded-bl-2xl"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              {/* Stock Badge */}
              <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium ${
                product.total_quantity === 0 ? 'bg-red-500 text-white' :
                product.total_quantity <= product.reorder_point ? 'bg-amber-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                {product.total_quantity === 0 ? 'Out of Stock' :
                 product.total_quantity <= product.reorder_point ? 'Low Stock' : 'In Stock'}
              </div>
            </div>

            {/* Right: Info */}
            <div className="flex flex-col">
              {/* Info Section */}
              <div className="p-4 md:p-6 bg-white">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">{product.name}</h2>
                {product.sku && (
                  <p className="text-sm text-gray-500 mt-1">SKU: {product.sku}</p>
                )}
                
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {product.is_retail && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Retail</span>
                  )}
                  {product.is_backbar && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Back Bar</span>
                  )}
                  {product.is_professional_only && (
                    <span className="px-2 py-1 bg-gray-800 text-white text-xs rounded-full">Pro Only</span>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{product.total_quantity}</p>
                    <p className="text-xs text-gray-500">Total Stock</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{product.reorder_point}</p>
                    <p className="text-xs text-gray-500">Reorder At</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{product.inventory.length}</p>
                    <p className="text-xs text-gray-500">Locations</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 bg-white">
                {(['overview', 'inventory', 'history'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-sm font-medium capitalize ${
                      activeTab === tab
                        ? 'text-rose-500 border-b-2 border-rose-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content - Scrollable on desktop */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 max-h-[400px] md:max-h-[500px]">
                {activeTab === 'overview' && (
                  <OverviewTab product={product} />
                )}
                {activeTab === 'inventory' && (
                  <InventoryTab product={product} />
                )}
                {activeTab === 'history' && (
                  <HistoryTab product={product} />
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons - Not fixed on desktop */}
          <div className="p-4 bg-white border-t border-gray-200 md:rounded-b-2xl flex gap-3">
            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-medium hover:bg-rose-600 active:scale-95 transition-all"
            >
              Adjust Stock
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-3 border border-red-300 text-red-600 rounded-xl hover:bg-red-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAdjustModalOpen && (
        <InventoryAdjustmentModal
          product={product}
          onClose={() => setIsAdjustModalOpen(false)}
          onSuccess={() => {
            setIsAdjustModalOpen(false);
          }}
        />
      )}
      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditProductModal
          product={product}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

// Sub-components

const OverviewTab: React.FC<{ product: ProductWithInventory }> = ({ product }) => (
  <div className="space-y-4">
    {product.description && (
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">Description</h3>
        <p className="text-sm text-gray-600">{product.description}</p>
      </div>
    )}
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs text-gray-500">Unit of Measure</p>
        <p className="text-sm font-medium text-gray-900 capitalize">{product.unit_of_measure}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Barcode</p>
        <p className="text-sm font-medium text-gray-900">{product.barcode || '—'}</p>
      </div>
    </div>
    
    {product.unit_cost && (
      <div>
        <p className="text-xs text-gray-500">Unit Cost</p>
        <p className="text-lg font-medium text-gray-900">${product.unit_cost.toFixed(2)}</p>
      </div>
    )}
  </div>
);

const InventoryTab: React.FC<{ product: ProductWithInventory }> = ({ product }) => (
  <div className="space-y-3">
    {product.inventory.length === 0 ? (
      <p className="text-sm text-gray-500 text-center py-4">No inventory records found</p>
    ) : (
      product.inventory.map((level) => (
        <div key={level.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">{level.location_id}</p>
            <p className="text-xs text-gray-500">
              {level.quantity_reserved} reserved
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{level.quantity_on_hand}</p>
            <p className="text-xs text-gray-500">on hand</p>
          </div>
        </div>
      ))
    )}
  </div>
);

const HistoryTab: React.FC<{ product: ProductWithInventory }> = () => (
  <div className="text-center py-8">
    <p className="text-sm text-gray-500">Transaction history coming soon</p>
  </div>
);
