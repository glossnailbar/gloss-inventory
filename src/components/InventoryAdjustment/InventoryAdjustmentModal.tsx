/**
 * InventoryAdjustmentModal - Quick stock updates
 * 
 * Simple interface for adding, removing, or setting stock levels.
 */

import React, { useState, useCallback } from 'react';
import { ProductWithInventory, adjustInventoryLevel, setInventoryLevel } from '../../db/operations/products';

export interface InventoryAdjustmentModalProps {
  product: ProductWithInventory;
  onClose: () => void;
  onSuccess?: () => void;
}

type AdjustmentType = 'add' | 'remove' | 'set' | 'move';

export const InventoryAdjustmentModal: React.FC<InventoryAdjustmentModalProps> = ({
  product,
  onClose,
  onSuccess,
}) => {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('add');
  const [quantity, setQuantity] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(
    product.inventory[0]?.location_id || ''
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const qty = parseInt(quantity) || 0;
    if (qty <= 0) return;

    setIsSubmitting(true);
    try {
      switch (adjustmentType) {
        case 'add':
          await adjustInventoryLevel(product.local_id, selectedLocation, qty);
          break;
        case 'remove':
          await adjustInventoryLevel(product.local_id, selectedLocation, -qty);
          break;
        case 'set':
          await setInventoryLevel(product.local_id, selectedLocation, qty);
          break;
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Adjustment failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [adjustmentType, quantity, selectedLocation, product.local_id, onClose, onSuccess]);

  const currentQuantity = product.inventory.find(
    (i) => i.location_id === selectedLocation
  )?.quantity_on_hand || 0;

  const previewQuantity = (() => {
    const qty = parseInt(quantity) || 0;
    switch (adjustmentType) {
      case 'add': return currentQuantity + qty;
      case 'remove': return Math.max(0, currentQuantity - qty);
      case 'set': return qty;
      default: return currentQuantity;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Adjust Stock</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Product Preview */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{product.name}</p>
              <p className="text-sm text-gray-500">Current: {currentQuantity} {product.unit_of_measure}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Location */}
          {product.inventory.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="grid grid-cols-2 gap-2">
                {product.inventory.map((level) => (
                  <button
                    key={level.location_id}
                    onClick={() => setSelectedLocation(level.location_id)}
                    className={`p-3 rounded-xl text-sm font-medium text-left transition-colors ${
                      selectedLocation === level.location_id
                        ? 'bg-rose-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {level.location_id}
                    <span className="block text-xs mt-1 opacity-80">
                      {level.quantity_on_hand} {product.unit_of_measure}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'add', label: 'Add Stock', icon: '+' },
                { type: 'remove', label: 'Remove', icon: '-' },
                { type: 'set', label: 'Set Count', icon: '=' },
              ].map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => setAdjustmentType(type as AdjustmentType)}
                  className={`p-3 rounded-xl text-sm font-medium text-center transition-colors ${
                    adjustmentType === type
                      ? 'bg-rose-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  <span className="block text-xs mt-1">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(0, parseInt(quantity || '0') - 1).toString())}
                className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl font-medium hover:bg-gray-200"
              >
                -
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1 text-center text-2xl font-bold py-3 border-2 border-gray-200 rounded-xl focus:border-rose-500 outline-none"
                placeholder="0"
              />
              <button
                onClick={() => setQuantity((parseInt(quantity || '0') + 1).toString())}
                className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl font-medium hover:bg-gray-200"
              >
                +
              </button>
            </div>
          </div>

          {/* Preview */}
          {quantity && (
            <div className="bg-rose-50 rounded-xl p-4 text-center">
              <p className="text-sm text-rose-700">
                {adjustmentType === 'add' && `Will add ${quantity} to stock`}
                {adjustmentType === 'remove' && `Will remove ${quantity} from stock`}
                {adjustmentType === 'set' && `Will set stock to ${quantity}`}
              </p>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {previewQuantity} {product.unit_of_measure}
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Damaged, Found in storage"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-rose-500 outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!quantity || parseInt(quantity) <= 0 || isSubmitting}
            className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
};
