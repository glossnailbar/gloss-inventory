/**
 * LocationManager - Manage inventory locations
 * 
 * Features:
 * - Add new locations
 * - View existing locations with item counts
 * - Edit/delete locations
 */

import React, { useState, useEffect } from 'react';
import { getAllFromStore, putToStore, deleteFromStore } from '../../db/database';
import { STORES, Category } from '../../db/schema';
import { generateLocalId } from '../../db/database';

interface LocationManagerProps {
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  onLocationsUpdated?: () => void;
}

export const LocationManager: React.FC<LocationManagerProps> = ({
  organizationId,
  isOpen,
  onClose,
  onLocationsUpdated,
}) => {
  const [locations, setLocations] = useState<Category[]>([]);
  const [newLocationName, setNewLocationName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingLocation, setEditingLocation] = useState<Category | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadLocations();
    }
  }, [isOpen]);

  const loadLocations = async () => {
    try {
      // Load categories as locations (Sortly folders)
      const cats = await getAllFromStore<Category>(STORES.categories);
      setLocations(cats.filter(l => l.is_active !== false));
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) return;

    const newCategory: Category = {
      local_id: generateLocalId(),
      organization_id: organizationId,
      name: newLocationName.trim(),
      is_active: true,
      sync_status: 'pending',
      sync_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await putToStore(STORES.categories, newCategory);
      setNewLocationName('');
      await loadLocations();
      onLocationsUpdated?.();
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  };

  const handleUpdateLocation = async (location: Category, newName: string) => {
    if (!newName.trim()) return;

    const updated: Location = {
      ...location,
      name: newName.trim(),
      updated_at: new Date().toISOString(),
      sync_version: location.sync_version + 1,
      sync_status: 'pending',
    };

    try {
      await putToStore(STORES.categories, updated);
      setEditingLocation(null);
      await loadLocations();
      onLocationsUpdated?.();
    } catch (err) {
      console.error('Failed to update location:', err);
    }
  };

  const handleDeleteLocation = async (location: Category) => {
    if (!confirm(`Delete location "${location.name}"?`)) return;

    try {
      await deleteFromStore(STORES.categories, location.local_id);
      await loadLocations();
      onLocationsUpdated?.();
    } catch (err) {
      console.error('Failed to delete location:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Manage Locations</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {/* Add New Location */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add New Location
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
                    placeholder="e.g., Front Desk, Back Bar, Storage"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddLocation}
                    disabled={!newLocationName.trim()}
                    className="px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Existing Locations */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Existing Locations ({locations.length})
                </h3>
                
                {locations.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No locations yet. Add your first location above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {locations.map((location) => (
                      <div
                        key={location.local_id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        {editingLocation?.local_id === location.local_id ? (
                          <>
                            <input
                              type="text"
                              defaultValue={location.name}
                              autoFocus
                              onBlur={(e) => handleUpdateLocation(location, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateLocation(location, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setEditingLocation(null);
                                }
                              }}
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                            />
                          </>
                        ) : (
                          <>
                            <span className="text-lg">📍</span>
                            <span className="flex-1 font-medium text-gray-900">
                              {location.name}
                            </span>
                            <button
                              onClick={() => setEditingLocation(location)}
                              className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteLocation(location)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
