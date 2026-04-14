/**
 * TransferInventory - Move inventory between locations
 */

import React, { useState, useCallback } from 'react';
import { ProductWithInventory } from '../../db/operations/products';
import { getAllFromStore, putToStore, deleteFromStore } from '../../db/database';
import { STORES, InventoryLevel } from '../../db/schema';
import { generateLocalId } from '../../db/database';
import { logActivity } from '../../db/operations/itemActivity';

export interface TransferInventoryProps {
  product: ProductWithInventory;
  locations: { id: string; name: string }[];
  onSuccess: () => void;
}

export const TransferInventory: React.FC<TransferInventoryProps> = ({
  product,
  locations,
  onSuccess,
}) => {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [transferring, setTransferring] = useState(false);

  const handleTransfer = useCallback(async () => {
    if (!fromLocation || !toLocation || !quantity || parseInt(quantity) <= 0) {
      alert('Please select locations and enter a valid quantity');
      return;
    }

    if (fromLocation === toLocation) {
      alert('Cannot transfer to the same location');
      return;
    }

    setTransferring(true);

    try {
      // Get current inventory levels
      const allLevels = await getAllFromStore<InventoryLevel>(STORES.inventory_levels);
      const productLevels = allLevels.filter(l => l.product_id === product.local_id);
      
      const fromLevel = productLevels.find(l => l.location_id === fromLocation);
      
      if (!fromLevel || fromLevel.quantity_on_hand < parseInt(quantity)) {
        alert(`Not enough stock in ${getLocationName(fromLocation)}. Available: ${fromLevel?.quantity_on_hand || 0}`);
        setTransferring(false);
        return;
      }

      // Update from location (decrease) - delete if reaches 0
      const newFromQuantity = fromLevel.quantity_on_hand - parseInt(quantity);
      if (newFromQuantity <= 0) {
        // Delete the inventory level record if it reaches 0
        await deleteFromStore(STORES.inventory_levels, fromLevel.id);
      } else {
        await putToStore(STORES.inventory_levels, {
          ...fromLevel,
          quantity_on_hand: newFromQuantity,
          updated_at: new Date().toISOString(),
          sync_status: 'pending',
        });
      }

      // Find or create to location
      let toLevel = productLevels.find(l => l.location_id === toLocation);
      
      if (toLevel) {
        // Update existing
        await putToStore(STORES.inventory_levels, {
          ...toLevel,
          quantity_on_hand: toLevel.quantity_on_hand + parseInt(quantity),
          updated_at: new Date().toISOString(),
          sync_status: 'pending',
        });
      } else {
        // Create new level
        const newLevel: InventoryLevel = {
          id: generateLocalId(),
          local_id: generateLocalId(),
          product_id: product.local_id,
          location_id: toLocation,
          quantity_on_hand: parseInt(quantity),
          quantity_allocated: 0,
          quantity_available: parseInt(quantity),
          sync_status: 'pending',
          sync_version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await putToStore(STORES.inventory_levels, newLevel);
      }

      // Log the transfer activities
      await logActivity(product.local_id, 'transfer_out', {
        quantity_before: fromLevel.quantity_on_hand,
        quantity_after: newFromQuantity,
        from_location_id: fromLocation,
        to_location_id: toLocation,
        note: `Moved ${quantity} to ${getLocationName(toLocation)}`,
      });

      await logActivity(product.local_id, 'transfer_in', {
        quantity_before: toLevel?.quantity_on_hand || 0,
        quantity_after: (toLevel?.quantity_on_hand || 0) + parseInt(quantity),
        from_location_id: fromLocation,
        to_location_id: toLocation,
        note: `Received ${quantity} from ${getLocationName(fromLocation)}`,
      });

      // Reset form
      setFromLocation('');
      setToLocation('');
      setQuantity('');
      onSuccess();
      
    } catch (err) {
      console.error('Transfer failed:', err);
      alert('Failed to transfer inventory');
    } finally {
      setTransferring(false);
    }
  }, [fromLocation, toLocation, quantity, product, onSuccess]);

  const getLocationName = (id: string) => {
    return locations.find(l => l.id === id)?.name || id;
  };

  // Filter locations that have inventory
  const availableFromLocations = locations.filter(loc => 
    product.inventory.some(inv => inv.location_id === loc.id && inv.quantity_on_hand > 0)
  );

  return (
    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
      <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Transfer Between Locations
      </h4>
      
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">From</label>
          <select
            value={fromLocation}
            onChange={(e) => setFromLocation(e.target.value)}
            className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="">Select location</option>
            {availableFromLocations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          {fromLocation && (
            <p className="text-xs text-amber-700 mt-1">
              Available: {product.inventory.find(i => i.location_id === fromLocation)?.quantity_on_hand || 0}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">To</label>
          <select
            value={toLocation}
            onChange={(e) => setToLocation(e.target.value)}
            className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="">Select location</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      </div>

      <button
        onClick={handleTransfer}
        disabled={transferring || !fromLocation || !toLocation || !quantity}
        className="mt-3 w-full py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {transferring ? 'Moving...' : 'Move Inventory'}
      </button>
    </div>
  );
};
