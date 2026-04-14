/**
 * Sidebar - Navigation sidebar with locations
 * 
 * Features:
 * - View All Items link
 * - Location-based navigation (like Sortly)
 * - Collapsible on mobile
 */

import React, { useState, useEffect } from 'react';
import { getAllFromStore } from '../../db/database';
import { STORES, Location } from '../../db/schema';

export interface SidebarProps {
  selectedLocation: string | null;
  onSelectLocation: (locationId: string | null) => void;
  onViewAll: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedLocation,
  onSelectLocation,
  onViewAll,
  isOpen,
  onClose,
}) => {
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locs = await getAllFromStore<Location>(STORES.locations);
        setLocations(locs.filter(l => l.is_active));
      } catch (err) {
        console.error('Failed to load locations:', err);
      }
    };
    loadLocations();
  }, []);

  // Default locations if none exist
  const defaultLocations = [
    { id: 'default', name: 'Front Desk', icon: '🏢' },
    { id: 'backbar', name: 'Back Bar', icon: '💅' },
    { id: 'storage', name: 'Storage', icon: '📦' },
  ];

  const displayLocations = locations.length > 0 
    ? locations.map(l => ({ id: l.local_id, name: l.name, icon: '📍' }))
    : defaultLocations;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-bold text-lg text-gray-900">Gloss Inventory</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 md:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {/* View All Items */}
          <button
            onClick={() => {
              onViewAll();
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              selectedLocation === null
                ? 'bg-rose-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>View All Items</span>
          </button>

          {/* Divider */}
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Locations
            </p>
          </div>

          {/* Location Links */}
          {displayLocations.map((location) => (
            <button
              key={location.id}
              onClick={() => {
                onSelectLocation(location.id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                selectedLocation === location.id
                  ? 'bg-rose-100 text-rose-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">{location.icon}</span>
              <span>{location.name}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Gloss Inventory v1.0
          </p>
        </div>
      </aside>
    </>
  );
};
