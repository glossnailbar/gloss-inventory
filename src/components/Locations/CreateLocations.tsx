/**
 * CreateLocations - Quick tool to create the 3 Sortly locations
 * and update all items to use them
 */

import React, { useState } from 'react';
import { getAllFromStore, putToStore, deleteFromStore } from '../../db/database';
import { STORES, Location, InventoryLevel } from '../../db/schema';
import { generateLocalId } from '../../db/database';

const SORTLY_LOCATIONS = [
  { id: 'salon-504', name: 'Salon - 504 W Gray' },
  { id: 'storage-1002', name: 'Storage - 1002' },
  { id: 'storage-1084', name: 'Storage - 1084' },
];

export const CreateLocations: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    errors: string[];
  } | null>(null);

  const runCreate = async () => {
    setIsRunning(true);
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    try {
      // Step 1: Create the 3 locations
      for (const loc of SORTLY_LOCATIONS) {
        try {
          const existing = await getAllFromStore<Location>(STORES.locations);
          const exists = existing.find(l => l.name === loc.name);
          
          if (!exists) {
            const newLocation: Location = {
              local_id: loc.id,
              organization_id: 'demo-gloss-heights',
              name: loc.name,
              is_active: true,
              sync_status: 'pending',
              sync_version: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            await putToStore(STORES.locations, newLocation);
            created++;
          }
        } catch (err) {
          errors.push(`Failed to create ${loc.name}: ${err}`);
        }
      }

      // Step 2: Get categories and map them to locations
      const categories = await getAllFromStore(STORES.categories);
      const categoryMap: Record<string, string> = {};
      
      for (const cat of categories) {
        const name = cat.name?.toLowerCase() || '';
        if (name.includes('504') || name.includes('gray') || name.includes('salon')) {
          categoryMap[cat.local_id] = 'salon-504';
        } else if (name.includes('1002')) {
          categoryMap[cat.local_id] = 'storage-1002';
        } else if (name.includes('1084')) {
          categoryMap[cat.local_id] = 'storage-1084';
        }
      }

      // Step 3: Update inventory levels based on product categories
      const products = await getAllFromStore(STORES.products);
      const inventoryLevels = await getAllFromStore<InventoryLevel>(STORES.inventory_levels);

      for (const level of inventoryLevels) {
        const product = products.find((p: any) => p.local_id === level.product_id);
        
        if (product?.category_id && categoryMap[product.category_id]) {
          const newLocationId = categoryMap[product.category_id];
          
          if (level.location_id !== newLocationId) {
            // Delete old level
            await deleteFromStore(STORES.inventory_levels, level.id);
            
            // Create new level with correct location
            const newLevel: InventoryLevel = {
              ...level,
              id: generateLocalId(),
              location_id: newLocationId,
              updated_at: new Date().toISOString(),
            };
            await putToStore(STORES.inventory_levels, newLevel);
            updated++;
          }
        }
      }

      setResult({ created, updated, errors });
    } catch (err) {
      errors.push(`General error: ${err}`);
      setResult({ created, updated, errors });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Create Sortly Locations</h2>
      
      {!result ? (
        <>
          <p className="mb-4 text-gray-600">
            This will create the 3 locations from your Sortly data:
          </p>
          
          <div className="space-y-2 mb-6">
            {SORTLY_LOCATIONS.map(loc => (
              <div key={loc.id} className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                <span className="text-2xl">📍</span>
                <span className="font-medium">{loc.name}</span>
              </div>
            ))}
          </div>
          
          <button
            onClick={runCreate}
            disabled={isRunning}
            className="w-full py-3 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 disabled:opacity-50"
          >
            {isRunning ? 'Creating...' : 'Create Locations & Update Items'}
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-green-600">✓ Complete!</h3>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="font-medium">Locations Created: {result.created}</p>
            <p className="font-medium">Items Updated: {result.updated}</p>
          </div>
          
          {result.errors.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="font-medium text-red-700">Errors:</p>
              <ul className="list-disc ml-6 mt-2 text-red-600">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          
          <p className="text-gray-600">
            Refresh the page to see your locations in the sidebar.
          </p>
        </div>
      )}
    </div>
  );
};
