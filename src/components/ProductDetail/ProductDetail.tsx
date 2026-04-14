/**
 * ProductDetail - Sortly-style full product view
 * 
 * Features:
 * - Large image carousel (multiple photos)
 * - Complete field display matching Sortly layout
 * - Desktop: Larger view with two-column layout
 * - Mobile: Full-screen with scroll
 */

import React, { useState, useCallback } from 'react';
import { ProductWithInventory, deleteProduct, updateProduct } from '../../db/operations/products';
import { InventoryAdjustmentModal } from '../InventoryAdjustment/InventoryAdjustmentModal';
import { InlineEditForm } from './InlineEditForm';
import { TransferInventory } from './TransferInventory';
import { useLocations } from '../../hooks/useLocations';

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
  const [isEditing, setIsEditing] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { locations } = useLocations('demo-gloss-heights');

  const handleDelete = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(product.local_id);
      onDelete?.();
    }
  }, [product.local_id, onDelete]);

  // Get all available images
  const images = [
    product.image_url,
    product.image_url2,
    product.image_url3
  ].filter(Boolean) as string[];

  const hasImages = images.length > 0;
  const activeImage = hasImages ? images[activeImageIndex] : null;

  // Calculate stock status
  const stockStatus = product.total_quantity === 0 
    ? { label: 'Out of Stock', color: 'bg-red-500' }
    : product.total_quantity <= product.reorder_point
    ? { label: 'Low Stock', color: 'bg-amber-500' }
    : { label: 'In Stock', color: 'bg-green-500' };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Desktop Container - Maximized */}
      <div className="max-w-7xl mx-auto py-4 lg:py-6">
        {/* Card */}
        <div className="bg-white md:rounded-2xl md:shadow-lg overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 md:px-6 lg:px-8">
              <button
                onClick={onBack}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900 md:hover:bg-gray-100 md:rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="font-semibold text-gray-900 truncate flex-1 text-center md:text-lg lg:text-xl">
                {product.name}
              </h1>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 -mr-2 text-rose-500 hover:text-rose-600 md:hover:bg-rose-50 md:rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Content - Two Column Layout - Maximized */}
          <div className="xl:grid xl:grid-cols-3 xl:min-h-[calc(100vh-120px)]">
            {/* Left Column - Images - Takes 1/3 on desktop */}
            <div className="xl:col-span-1 bg-gray-50 flex flex-col">
              {/* Main Image - Smaller size */}
              <div className="relative aspect-square flex-shrink-0">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-32 h-32 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                {/* Stock Status Badge */}
                <div className={`absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-semibold text-white ${stockStatus.color} shadow-lg`}>
                  {stockStatus.label}
                </div>
              </div>

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto bg-white border-t border-gray-200">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === activeImageIndex ? 'border-rose-500 ring-2 ring-rose-200' : 'border-gray-200'
                      }`}
                    >
                      <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Product Info - Takes 2/3 on desktop */}
            <div className="xl:col-span-2 p-4 md:p-6 lg:p-8 xl:p-10 overflow-y-auto xl:max-h-[calc(100vh-120px)]">
              {isEditing ? (
                <InlineEditForm
                  product={product}
                  onCancel={() => setIsEditing(false)}
                  onSave={() => {
                    setIsEditing(false);
                    window.location.reload();
                  }}
                />
              ) : (
                <>
              {/* Title Section */}
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{product.name}</h2>
                {product.sku && (
                  <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {product.brand && (
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    {product.brand}
                  </span>
                )}
                {product.origin && (
                  <span className="px-3 py-1.5 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                    {product.origin}
                  </span>
                )}
                {product.is_retail && (
                  <span className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-full">Retail</span>
                )}
                {product.is_backbar && (
                  <span className="px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">Back Bar</span>
                )}
                {product.is_professional_only && (
                  <span className="px-3 py-1.5 bg-gray-800 text-white text-sm font-medium rounded-full">Pro Only</span>
                )}
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="In Stock" value={product.total_quantity.toString()} />
                <StatCard label="Reorder At" value={product.reorder_point.toString()} />
                <StatCard label="Max Level" value={product.max_level?.toString() || '—'} />
                <StatCard label="Locations" value={product.inventory.length.toString()} />
              </div>

              {/* Pricing Section */}
              <Section title="Pricing">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Unit Cost" value={product.unit_cost ? `$${product.unit_cost.toFixed(2)}` : '—'} />
                  <Field label="Price Per" value={product.price_per ? `$${product.price_per.toFixed(2)}` : '—'} />
                </div>
              </Section>

              {/* Product Details Section */}
              <Section title="Product Details">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Item Size" value={product.item_size || '—'} />
                  <Field label="Pcs per Box" value={product.pcs_per_box?.toString() || '—'} />
                  <Field label="Unit of Measure" value={product.unit_of_measure || '—'} />
                  <Field label="Barcode" value={product.barcode || '—'} />
                </div>
              </Section>

              {/* Vendor Section */}
              <Section title="Vendor Information">
                <div className="space-y-3">
                  <Field label="Vendor" value={product.vendor_name || product.vendor_id || '—'} />
                  {product.purchase_link && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Purchase Link</p>
                      <a 
                        href={product.purchase_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-rose-600 hover:text-rose-700 hover:underline break-all"
                      >
                        {product.purchase_link}
                      </a>
                    </div>
                  )}
                </div>
              </Section>

              {/* Custom Attributes */}
              {(product.attribute1_name || product.attribute2_name || product.attribute3_name) && (
                <Section title="Attributes">
                  <div className="grid grid-cols-2 gap-4">
                    {product.attribute1_name && (
                      <Field label={product.attribute1_name} value={product.attribute1_value || '—'} />
                    )}
                    {product.attribute2_name && (
                      <Field label={product.attribute2_name} value={product.attribute2_value || '—'} />
                    )}
                    {product.attribute3_name && (
                      <Field label={product.attribute3_name} value={product.attribute3_value || '—'} />
                    )}
                  </div>
                </Section>
              )}

              {/* Tags */}
              {product.tags && (
                <Section title="Tags">
                  <div className="flex flex-wrap gap-2">
                    {product.tags.split(',').map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Description */}
              {product.description && (
                <Section title="Description / Notes">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{product.description}</p>
                </Section>
              )}

              {/* Inventory by Location - Filter out zero quantity */}
              <Section title="Inventory by Location">
                {(() => {
                  const nonZeroInventory = product.inventory.filter(level => level.quantity_on_hand > 0);
                  
                  if (nonZeroInventory.length === 0) {
                    return <p className="text-sm text-gray-500">No inventory records</p>;
                  }
                  
                  return (
                    <div className="space-y-2">
                      {nonZeroInventory.map((level) => (
                        <div key={level.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-900">{level.location_id}</span>
                          <div className="text-right">
                            <span className="text-lg font-bold text-gray-900">{level.quantity_on_hand}</span>
                            <span className="text-xs text-gray-500 ml-1">on hand</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </Section>

              {/* Transfer Inventory - Only show if there's inventory to move */}
              {!isEditing && product.inventory.some(level => level.quantity_on_hand > 0) && (
                <TransferInventory
                  product={product}
                  locations={locations.map(l => ({ id: l.local_id, name: l.name }))}
                  onSuccess={() => window.location.reload()}
                />
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setIsAdjustModalOpen(true)}
                  className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-semibold hover:bg-rose-600 active:scale-95 transition-all shadow-lg shadow-rose-200"
                >
                  Adjust Stock
                </button>
                <button
                  onClick={handleDelete}
                  className="px-5 py-3 border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
              </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAdjustModalOpen && (
        <InventoryAdjustmentModal
          product={product}
          onClose={() => setIsAdjustModalOpen(false)}
          onSuccess={() => setIsAdjustModalOpen(false)}
        />
      )}
    </div>
  );
};

// Helper Components

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">{title}</h3>
    {children}
  </div>
);

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
    <p className="text-sm font-medium text-gray-900">{value}</p>
  </div>
);

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-gray-50 rounded-xl p-4 text-center">
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500 mt-1">{label}</p>
  </div>
);
