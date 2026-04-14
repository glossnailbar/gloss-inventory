/**
 * EditProductModal - Full product edit with all fields
 * 
 * Desktop: Full-screen dialog with organized sections
 * Mobile: Scrollable modal
 */

import React, { useState, useEffect } from 'react';
import { ProductWithInventory, updateProduct } from '../../db/operations/products';

interface EditProductModalProps {
  product: ProductWithInventory;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    // Basic Info
    name: product.name,
    sku: product.sku || '',
    barcode: product.barcode || '',
    description: product.description || '',
    
    // Pricing
    unit_cost: product.unit_cost || '',
    price_per: product.price_per || '',
    
    // Inventory Settings
    unit_of_measure: product.unit_of_measure || 'piece',
    reorder_point: product.reorder_point || 0,
    reorder_quantity: product.reorder_quantity || 0,
    max_level: product.max_level || '',
    
    // Product Details
    brand: product.brand || '',
    origin: product.origin || '',
    item_size: product.item_size || '',
    pcs_per_box: product.pcs_per_box || '',
    
    // Vendor
    purchase_link: product.purchase_link || '',
    
    // Attributes
    attribute1_name: product.attribute1_name || '',
    attribute1_value: product.attribute1_value || '',
    attribute2_name: product.attribute2_name || '',
    attribute2_value: product.attribute2_value || '',
    attribute3_name: product.attribute3_name || '',
    attribute3_value: product.attribute3_value || '',
    
    // Tags
    tags: product.tags || '',
    
    // Images
    image_url: product.image_url || '',
    image_url2: product.image_url2 || '',
    image_url3: product.image_url3 || '',
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: product.name,
        sku: product.sku || '',
        barcode: product.barcode || '',
        description: product.description || '',
        unit_cost: product.unit_cost || '',
        price_per: product.price_per || '',
        unit_of_measure: product.unit_of_measure || 'piece',
        reorder_point: product.reorder_point || 0,
        reorder_quantity: product.reorder_quantity || 0,
        max_level: product.max_level || '',
        brand: product.brand || '',
        origin: product.origin || '',
        item_size: product.item_size || '',
        pcs_per_box: product.pcs_per_box || '',
        purchase_link: product.purchase_link || '',
        attribute1_name: product.attribute1_name || '',
        attribute1_value: product.attribute1_value || '',
        attribute2_name: product.attribute2_name || '',
        attribute2_value: product.attribute2_value || '',
        attribute3_name: product.attribute3_name || '',
        attribute3_value: product.attribute3_value || '',
        tags: product.tags || '',
        image_url: product.image_url || '',
        image_url2: product.image_url2 || '',
        image_url3: product.image_url3 || '',
      });
    }
  }, [isOpen, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateProduct(product.local_id, {
        name: formData.name,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        description: formData.description || undefined,
        unit_of_measure: formData.unit_of_measure,
        reorder_point: Number(formData.reorder_point),
        reorder_quantity: Number(formData.reorder_quantity),
        max_level: formData.max_level ? Number(formData.max_level) : undefined,
        unit_cost: formData.unit_cost ? Number(formData.unit_cost) : undefined,
        price_per: formData.price_per ? Number(formData.price_per) : undefined,
        purchase_link: formData.purchase_link || undefined,
        brand: formData.brand || undefined,
        origin: formData.origin || undefined,
        item_size: formData.item_size || undefined,
        pcs_per_box: formData.pcs_per_box ? Number(formData.pcs_per_box) : undefined,
        tags: formData.tags || undefined,
        attribute1_name: formData.attribute1_name || undefined,
        attribute1_value: formData.attribute1_value || undefined,
        attribute2_name: formData.attribute2_name || undefined,
        attribute2_value: formData.attribute2_value || undefined,
        attribute3_name: formData.attribute3_name || undefined,
        attribute3_value: formData.attribute3_value || undefined,
        image_url: formData.image_url || undefined,
        image_url2: formData.image_url2 || undefined,
        image_url3: formData.image_url3 || undefined,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to update product:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'details', label: 'Details' },
    { id: 'attributes', label: 'Attributes' },
    { id: 'images', label: 'Images' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-hidden flex items-start justify-center md:items-center">
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl md:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-8 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Edit Product</h2>
            <p className="text-sm text-gray-500">Update all product details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Sidebar + Form */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation - Desktop */}
          <div className="hidden md:flex w-64 flex-col border-r border-gray-200 bg-gray-50 p-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`text-left px-4 py-3 rounded-lg font-medium transition-colors mb-1 ${
                  activeSection === section.id
                    ? 'bg-rose-500 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {/* Mobile Section Selector */}
          <div className="md:hidden px-4 py-3 border-b border-gray-200">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <form id="edit-product-form" onSubmit={handleSubmit} className="max-w-3xl">
              {/* Basic Info Section */}
              {activeSection === 'basic' && (
                <div className="space-y-6">
                  <SectionTitle icon="📦" title="Basic Information" />
                  
                  <div className="space-y-4">
                    <Field
                      label="Product Name *"
                      type="text"
                      value={formData.name}
                      onChange={(v) => setFormData({ ...formData, name: v })}
                      required
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field
                        label="SKU"
                        type="text"
                        value={formData.sku}
                        onChange={(v) => setFormData({ ...formData, sku: v })}
                      />
                      <Field
                        label="Barcode"
                        type="text"
                        value={formData.barcode}
                        onChange={(v) => setFormData({ ...formData, barcode: v })}
                      />
                    </div>
                    <TextArea
                      label="Description / Notes"
                      value={formData.description}
                      onChange={(v) => setFormData({ ...formData, description: v })}
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {/* Pricing Section */}
              {activeSection === 'pricing' && (
                <div className="space-y-6">
                  <SectionTitle icon="💰" title="Pricing Information" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field
                      label="Unit Cost ($)"
                      type="number"
                      step="0.01"
                      value={formData.unit_cost}
                      onChange={(v) => setFormData({ ...formData, unit_cost: v })}
                    />
                    <Field
                      label="Price Per ($)"
                      type="number"
                      step="0.01"
                      value={formData.price_per}
                      onChange={(v) => setFormData({ ...formData, price_per: v })}
                    />
                    <Field
                      label="Purchase Link"
                      type="url"
                      value={formData.purchase_link}
                      onChange={(v) => setFormData({ ...formData, purchase_link: v })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}

              {/* Inventory Section */}
              {activeSection === 'inventory' && (
                <div className="space-y-6">
                  <SectionTitle icon="📊" title="Inventory Settings" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field
                      label="Unit of Measure"
                      type="text"
                      value={formData.unit_of_measure}
                      onChange={(v) => setFormData({ ...formData, unit_of_measure: v })}
                      placeholder="piece, bottle, pack, etc."
                    />
                    <Field
                      label="Reorder Point"
                      type="number"
                      value={formData.reorder_point}
                      onChange={(v) => setFormData({ ...formData, reorder_point: Number(v) })}
                    />
                    <Field
                      label="Reorder Quantity"
                      type="number"
                      value={formData.reorder_quantity}
                      onChange={(v) => setFormData({ ...formData, reorder_quantity: Number(v) })}
                    />
                    <Field
                      label="Max Level"
                      type="number"
                      value={formData.max_level}
                      onChange={(v) => setFormData({ ...formData, max_level: v })}
                    />
                  </div>
                </div>
              )}

              {/* Product Details Section */}
              {activeSection === 'details' && (
                <div className="space-y-6">
                  <SectionTitle icon="📝" title="Product Details" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field
                      label="Brand"
                      type="text"
                      value={formData.brand}
                      onChange={(v) => setFormData({ ...formData, brand: v })}
                    />
                    <Field
                      label="Origin (Country)"
                      type="text"
                      value={formData.origin}
                      onChange={(v) => setFormData({ ...formData, origin: v })}
                    />
                    <Field
                      label="Item Size"
                      type="text"
                      value={formData.item_size}
                      onChange={(v) => setFormData({ ...formData, item_size: v })}
                      placeholder="e.g., 16 oz, 500ml"
                    />
                    <Field
                      label="Pieces per Box"
                      type="number"
                      value={formData.pcs_per_box}
                      onChange={(v) => setFormData({ ...formData, pcs_per_box: v })}
                    />
                  </div>
                  
                  <TextArea
                    label="Tags (comma separated)"
                    value={formData.tags}
                    onChange={(v) => setFormData({ ...formData, tags: v })}
                    placeholder="retail, professional, hot-selling, etc."
                    rows={2}
                  />
                </div>
              )}

              {/* Attributes Section */}
              {activeSection === 'attributes' && (
                <div className="space-y-6">
                  <SectionTitle icon="🏷️" title="Custom Attributes" />
                  
                  <div className="space-y-4">
                    <AttributeRow
                      name={formData.attribute1_name}
                      value={formData.attribute1_value}
                      onNameChange={(v) => setFormData({ ...formData, attribute1_name: v })}
                      onValueChange={(v) => setFormData({ ...formData, attribute1_value: v })}
                      placeholder="e.g., Color, Size, Material"
                    />
                    <AttributeRow
                      name={formData.attribute2_name}
                      value={formData.attribute2_value}
                      onNameChange={(v) => setFormData({ ...formData, attribute2_name: v })}
                      onValueChange={(v) => setFormData({ ...formData, attribute2_value: v })}
                    />
                    <AttributeRow
                      name={formData.attribute3_name}
                      value={formData.attribute3_value}
                      onNameChange={(v) => setFormData({ ...formData, attribute3_name: v })}
                      onValueChange={(v) => setFormData({ ...formData, attribute3_value: v })}
                    />
                  </div>
                </div>
              )}

              {/* Images Section */}
              {activeSection === 'images' && (
                <div className="space-y-6">
                  <SectionTitle icon="🖼️" title="Product Images" />
                  
                  <div className="space-y-4">
                    <Field
                      label="Primary Image URL"
                      type="url"
                      value={formData.image_url}
                      onChange={(v) => setFormData({ ...formData, image_url: v })}
                      placeholder="https://..."
                    />
                    {formData.image_url && (
                      <img src={formData.image_url} alt="Preview" className="w-32 h-32 object-cover rounded-lg border" />
                    )}
                    
                    <Field
                      label="Image 2 URL"
                      type="url"
                      value={formData.image_url2}
                      onChange={(v) => setFormData({ ...formData, image_url2: v })}
                      placeholder="https://..."
                    />
                    {formData.image_url2 && (
                      <img src={formData.image_url2} alt="Preview 2" className="w-32 h-32 object-cover rounded-lg border" />
                    )}
                    
                    <Field
                      label="Image 3 URL"
                      type="url"
                      value={formData.image_url3}
                      onChange={(v) => setFormData({ ...formData, image_url3: v })}
                      placeholder="https://..."
                    />
                    {formData.image_url3 && (
                      <img src={formData.image_url3} alt="Preview 3" className="w-32 h-32 object-cover rounded-lg border" />
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 md:px-8 py-4 border-t border-gray-200 bg-white flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-gray-600 font-medium hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            form="edit-product-form"
            type="submit"
            disabled={isSaving}
            className="px-8 py-2.5 bg-rose-500 text-white font-semibold rounded-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-rose-200"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper Components

const SectionTitle: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-6">
    <span className="text-2xl">{icon}</span>
    <h3 className="text-xl font-bold text-gray-900">{title}</h3>
  </div>
);

const Field: React.FC<{
  label: string;
  type: string;
  value: string | number;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  step?: string;
}> = ({ label, type, value, onChange, required, placeholder, step }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      step={step}
      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
    />
  </div>
);

const TextArea: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}> = ({ label, value, onChange, rows = 3, placeholder }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors resize-none"
    />
  </div>
);

const AttributeRow: React.FC<{
  name: string;
  value: string;
  onNameChange: (v: string) => void;
  onValueChange: (v: string) => void;
  placeholder?: string;
}> = ({ name, value, onNameChange, onValueChange, placeholder }) => (
  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Attribute Name</label>
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500"
      />
    </div>
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Attribute Value</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500"
      />
    </div>
  </div>
);
