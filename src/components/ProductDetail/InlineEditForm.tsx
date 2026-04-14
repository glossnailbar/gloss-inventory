/**
 * InlineEditForm - Direct inline editing for product details
 * 
 * Replaces the modal with editable fields directly on the page
 */

import React, { useState, useCallback } from 'react';
import { ProductWithInventory, updateProduct } from '../../db/operations/products';
import { logActivity } from '../../db/operations/itemActivity';

export interface InlineEditFormProps {
  product: ProductWithInventory;
  onCancel: () => void;
  onSave: () => void;
}

export const InlineEditForm: React.FC<InlineEditFormProps> = ({
  product,
  onCancel,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: product.name,
    sku: product.sku || '',
    barcode: product.barcode || '',
    unit_cost: product.unit_cost?.toString() || '',
    price_per: product.price_per?.toString() || '',
    item_size: product.item_size || '',
    pcs_per_box: product.pcs_per_box?.toString() || '',
    reorder_point: product.reorder_point?.toString() || '0',
    max_level: product.max_level?.toString() || '',
    purchase_link: product.purchase_link || '',
    description: product.description || '',
    brand: product.brand || '',
    origin: product.origin || '',
    tags: product.tags || '',
    unit_of_measure: product.unit_of_measure || 'piece',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateProduct(product.local_id, {
        name: formData.name,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
        price_per: formData.price_per ? parseFloat(formData.price_per) : null,
        item_size: formData.item_size || null,
        pcs_per_box: formData.pcs_per_box ? parseInt(formData.pcs_per_box) : null,
        reorder_point: parseInt(formData.reorder_point) || 0,
        max_level: formData.max_level ? parseInt(formData.max_level) : null,
        purchase_link: formData.purchase_link || null,
        description: formData.description || null,
        brand: formData.brand || null,
        origin: formData.origin || null,
        tags: formData.tags || null,
        unit_of_measure: formData.unit_of_measure || 'piece',
      });

      // Log the edit activity
      await logActivity(product.local_id, 'edit', {
        note: 'Updated product details',
      });

      onSave();
    } catch (err) {
      console.error('Failed to update product:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [formData, product.local_id, onSave]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header with Save/Cancel */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 -mx-4 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Basic Info */}
      <EditSection title="Basic Information">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => handleChange('sku', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => handleChange('barcode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>
          </div>
        </div>
      </EditSection>

      {/* Pricing */}
      <EditSection title="Pricing">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.unit_cost}
              onChange={(e) => handleChange('unit_cost', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price Per ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.price_per}
              onChange={(e) => handleChange('price_per', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
        </div>
      </EditSection>

      {/* Product Details */}
      <EditSection title="Product Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Size</label>
            <input
              type="text"
              value={formData.item_size}
              onChange={(e) => handleChange('item_size', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pcs per Box</label>
            <input
              type="number"
              value={formData.pcs_per_box}
              onChange={(e) => handleChange('pcs_per_box', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
            <select
              value={formData.unit_of_measure}
              onChange={(e) => handleChange('unit_of_measure', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            >
              <option value="piece">piece</option>
              <option value="box">box</option>
              <option value="case">case</option>
              <option value="bottle">bottle</option>
              <option value="unit">unit</option>
            </select>
          </div>
        </div>
      </EditSection>

      {/* Stock Settings */}
      <EditSection title="Stock Settings">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
            <input
              type="number"
              value={formData.reorder_point}
              onChange={(e) => handleChange('reorder_point', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Level</label>
            <input
              type="number"
              value={formData.max_level}
              onChange={(e) => handleChange('max_level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
        </div>
      </EditSection>

      {/* Vendor */}
      <EditSection title="Vendor Information">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Link</label>
          <input
            type="url"
            value={formData.purchase_link}
            onChange={(e) => handleChange('purchase_link', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>
      </EditSection>

      {/* Tags & Attributes */}
      <EditSection title="Tags & Attributes">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
            <input
              type="text"
              value={formData.origin}
              onChange={(e) => handleChange('origin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => handleChange('tags', e.target.value)}
            placeholder="tag1, tag2, tag3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>
      </EditSection>

      {/* Description */}
      <EditSection title="Description / Notes">
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
        />
      </EditSection>
    </form>
  );
};

const EditSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border-b border-gray-200 pb-6">
    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">{title}</h3>
    {children}
  </div>
);
