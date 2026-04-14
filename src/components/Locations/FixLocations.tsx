/**
 * FixLocations - Script to categorize items into correct Sortly locations
 * 
 * This script:
 * 1. Reads all items and extracts the location field
 * 2. Creates proper Location records for each unique location
 * 3. Updates inventory levels to use correct location IDs
 * 4. Shows a summary of what was done
 */

import React, { useState, useEffect } from 'react';
import { getAllFromStore, putToStore, deleteFromStore, generateLocalId } from '../../db/database';
import { STORES, Location, InventoryLevel } from '../../db/schema';

interface FixResult {
  locationsCreated: string[];
  itemsUpdated: number;
  errors: string[];
}

export const FixLocations: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const [preview, setPreview] = useState<{ location: string; count: number }[]>([]);

  useEffect(() => {
    // Scan for locations in product data
    const scanLocations = async () => {
      try {
        const products = await getAllFromStore(STORES.products);
        const locationCounts: Record<string, number> = {};
        
        for (const product of products) {
          const loc = product.location || 'default';
          locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        }
        
        const sorted = Object.entries(locationCounts)
          .map(([location, count]) => ({ location, count }))
          .sort((a, b) => b.count - a.count);
        
        setPreview(sorted);
      } catch (err) {
        console.error('Failed to scan:', err);
      }
    };
    
    scanLocations();
  }, []);

  const runFix = async () => {
    setIsRunning(true);
    const locationsCreated: string[] = [];
    const errors: string[] = [];
    let itemsUpdated = 0;

    try {
      // Step 1: Get all unique locations from product data
      const products = await getAllFromStore(STORES.products);
      const uniqueLocations = new Set<string>();
      
      for (const product of products) {
        if (product.location && product.location !== 'default') {
          uniqueLocations.add(product.location);
        }
      }
      
      console.log('Found locations in products:', Array.from(uniqueLocations));
      
      // Step 2: Create Location records for each
      const locationIdMap: Record<string, string> = {};
      
      for (const locationName of uniqueLocations) {
        try {
          // Check if location already exists
          const existingLocations = await getAllFromStore<Location>(STORES.locations);
          const existing = existingLocations.find(l => l.name === locationName);
          
          if (existing) {
            locationIdMap[locationName] = existing.local_id;
            console.log(`Location "${locationName}" already exists with ID: ${existing.local_id}`);
          } else {
            // Create new location
            const newLocation: Location = {
              local_id: generateLocalId(),
              organization_id: 'demo-gloss-heights',
              name: locationName,
              is_active: true,
              sync_status: 'pending',
              sync_version: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            
            await putToStore(STORES.locations, newLocation);
            locationIdMap[locationName] = newLocation.local_id;
            locationsCreated.push(locationName);
            console.log(`Created location "${locationName}" with ID: ${newLocation.local_id}`);
          }
        } catch (err) {
          errors.push(`Failed to create location "${locationName}": ${err}`);
        }
      }
      
      // Step 3: Update inventory levels
      const inventoryLevels = await getAllFromStore<InventoryLevel>(STORES.inventory_levels);
      
      for (const level of inventoryLevels) {
        if (level.location_id === 'default') {
          // Find the product for this inventory level
          const product = products.find((p: any) => p.local_id === level.product_id);
          
          if (product?.location && product.location !== 'default') {
            const newLocationId = locationIdMap[product.location];
            
            if (newLocationId) {
              // Delete old level with 'default'
              await deleteFromStore(STORES.inventory_levels, level.id);
              
              // Create new level with correct location
              const newLevel: InventoryLevel = {
                ...level,
                id: generateLocalId(),
                location_id: newLocationId,
                updated_at: new Date().toISOString(),
              };
              
              await putToStore(STORES.inventory_levels, newLevel);
              itemsUpdated++;
              console.log(`Updated item ${product.name} to location ${product.location}`);
            }
          }
        }
      }
      
      setResult({ locationsCreated, itemsUpdated, errors });
      
    } catch (err) {
      errors.push(`General error: ${err}`);
      setResult({ locationsCreated, itemsUpdated, errors });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Fix Sortly Locations</h2>
      
      {!result ? (
        <>
          <p className="mb-4 text-gray-600">
            This will scan your imported Sortly data and:
          </p>
          <ul className="list-disc ml-6 mb-4 text-gray-600">
            <li>Create Location records for each unique location found</li>
            <li>Move items to their correct locations</li>
            <li>Update the sidebar to show actual locations</li>
          </ul>
          
          {preview.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Locations found in your data:</h3>
              <div className="space-y-1">
                {preview.map(({ location, count }) => (
                  <div key={location} className="flex justify-between bg-gray-100 px-3 py-2 rounded">
                    <span>{location}</span>
                    <span className="text-gray-600">{count} items</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <button
            onClick={runFix}
            disabled={isRunning || preview.length === 0}
            className="w-full py-3 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 disabled:opacity-50"
          >
            {isRunning ? 'Processing...' : 'Fix Locations'}
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-green-600">✓ Complete!</h3>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="font-medium">Locations Created: {result.locationsCreated.length}</p>
            {result.locationsCreated.length > 0 && (
              <ul className="list-disc ml-6 mt-2">
                {result.locationsCreated.map(loc => (
                  <li key={loc}>{loc}</li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-medium">Items Updated: {result.itemsUpdated}</p>
          </div>
          
          {result.errors.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="font-medium text-red-700">Errors: {result.errors.length}</p>
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
