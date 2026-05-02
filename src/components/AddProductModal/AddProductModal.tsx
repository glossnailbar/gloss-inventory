/**
 * AddProductModal - Simplified single-step product creation
 */

import React, { useState, useCallback } from 'react';
import { createProduct } from '../../db/operations/products';
import { useCategories } from '../../hooks/useCategories';

export interface AddProductModalProps {
  organizationId: string;
  onClose: () => void;
  onSuccess?: () => void;
  initialBarcode?: string;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  organizationId,
  onClose,
  onSuccess,
  initialBarcode,
}) => {
  const { categories } = useCategories(organizationId);
  
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    barcode: initialBarcode || '',
    sku: '',
    unit_of_measure: 'each',
    reorder_point: 0,
    reorder_quantity: 0,
    is_retail: true,
    is_backbar: true,
    is_professional_only: false,
    has_variants: false,
    image_url: '',
    quantity: 0,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!formData.name) return;
    
    setIsSubmitting(true);
    try {
      await createProduct(
        {
          ...formData,
          organization_id: organizationId,
          category_id: formData.category_id || null,
        },
        formData.quantity > 0
          ? [{ location_id: 'default', quantity: formData.quantity }]
          : undefined
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to create product:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, organizationId, onClose, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:w-[480px] sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-500">
            Cancel
          </button>
          <h2 className="font-semibold text-gray-900">Add Product</h2>
          <button
            onClick={handleSubmit}
            disabled={!formData.name || isSubmitting}
            className="p-2 -mr-2 text-rose-500 font-medium disabled:text-gray-300"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Content - Single Step */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., OPI Lincoln Park After Dark"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category (Optional)</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.local_id}
                  onClick={() => setFormData({ ...formData, category_id: cat.local_id })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    formData.category_id === cat.local_id
                      ? 'bg-rose-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Initial Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Quantity</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              placeholder="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
            />
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="Scan or enter barcode"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-rose-500 outline-none"
            />
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Optional)</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="Internal SKU"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-rose-500 outline-none"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unit of Measure</label>
            <div className="grid grid-cols-3 gap-2">
              {['each', 'bottle', 'pack', 'ml', 'oz'].map((unit) => (
                <button
                  key={unit}
                  onClick={() => setFormData({ ...formData, unit_of_measure: unit })}
                  className={`py-3 rounded-xl text-sm font-medium capitalize transition-colors ${
                    formData.unit_of_measure === unit
                      ? 'bg-rose-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
