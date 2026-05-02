/**
 * AddProductModal - Quick product creation
 * 
 * Mobile-optimized with photo capture, barcode scanning, and quick category selection.
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
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const handleSubmit = useCallback(async () => {
    if (!formData.name) return;
    
    setIsSubmitting(true);
    try {
      // Create the product with quantity (category is now optional)
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

  const handleImageCapture = () => {
    // TODO: Implement camera capture or file picker
    console.log('Image capture not implemented yet');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:w-[480px] sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-500">
            Cancel
          </button>
          <h2 className="font-semibold text-gray-900">
            {currentStep === 1 ? 'Add Product' : 'Details'}
          </h2>
          <button
            onClick={currentStep === 1 ? () => setCurrentStep(2) : handleSubmit}
            disabled={!formData.name || isSubmitting}
            className="p-2 -mr-2 text-rose-500 font-medium disabled:text-gray-300"
          >
            {currentStep === 1 ? 'Next' : isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentStep === 1 ? (
            <Step1Content
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              onImageCapture={handleImageCapture}
            />
          ) : (
            <Step2Content
              formData={formData}
              setFormData={setFormData}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Step 1: Basic Info + Photo
const Step1Content: React.FC<{
  formData: any;
  setFormData: (data: any) => void;
  categories: any[];
  onImageCapture: () => void;
}> = ({ formData, setFormData, categories, onImageCapture }) => (
  <div className="space-y-6">
    {/* Photo */}
    <div className="flex justify-center">
      <button
        onClick={onImageCapture}
        className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-rose-500 transition-colors"
      >
        {formData.image_url ? (
          <img src={formData.image_url} alt="Product" className="w-full h-full object-cover rounded-xl" />
        ) : (
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>
    </div>

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
      <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
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

    {/* Barcode */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={formData.barcode}
          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
          placeholder="Scan or enter barcode"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:border-rose-500 outline-none"
        />
        <button className="px-4 py-3 bg-gray-100 rounded-xl hover:bg-gray-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4m-4 4h4m-4-8h4m-4 4h4m6 0v1a2 2 0 01-2 2h-2a2 2 0 01-2-2v-1m0-6V5a2 2 0 012-2h2a2 2 0 012 2v1" />
          </svg>
        </button>
      </div>
    </div>
  </div>
);

// Step 2: Additional Details
const Step2Content: React.FC<{
  formData: any;
  setFormData: (data: any) => void;
}> = ({ formData, setFormData }) => (
  <div className="space-y-6">
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

    {/* Reorder Settings */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
        <input
          type="number"
          value={formData.reorder_point}
          onChange={(e) => setFormData({ ...formData, reorder_point: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-rose-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Qty</label>
        <input
          type="number"
          value={formData.reorder_quantity}
          onChange={(e) => setFormData({ ...formData, reorder_quantity: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-rose-500 outline-none"
        />
      </div>
    </div>

    {/* Usage Type */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Usage Type</label>
      <div className="space-y-2">
        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:border-rose-300">
          <input
            type="checkbox"
            checked={formData.is_retail}
            onChange={(e) => setFormData({ ...formData, is_retail: e.target.checked })}
            className="w-5 h-5 text-rose-500 rounded focus:ring-rose-500"
          />
          <span className="flex-1">Sell to customers (Retail)</span>
        </label>
        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:border-rose-300">
          <input
            type="checkbox"
            checked={formData.is_backbar}
            onChange={(e) => setFormData({ ...formData, is_backbar: e.target.checked })}
            className="w-5 h-5 text-rose-500 rounded focus:ring-rose-500"
          />
          <span className="flex-1">Use in services (Back Bar)</span>
        </label>
        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:border-rose-300">
          <input
            type="checkbox"
            checked={formData.is_professional_only}
            onChange={(e) => setFormData({ ...formData, is_professional_only: e.target.checked })}
            className="w-5 h-5 text-rose-500 rounded focus:ring-rose-500"
          />
          <span className="flex-1">Professional use only</span>
        </label>
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
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-rose-500 outline-none"
      />
    </div>
  </div>
);
