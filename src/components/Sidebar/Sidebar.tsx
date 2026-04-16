/**
 * Sidebar - Navigation sidebar with actual locations from inventory
 * 
 * Features:
 * - View All Items link
 * - Location-based navigation from actual inventory data
 * - Collapsible on mobile
 */

import React, { useState, useEffect } from 'react';
import { getAllFromStore } from '../../db/database';
import { STORES, InventoryLevel } from '../../db/schema';

export interface SidebarProps {
  selectedLocation: string | null;
  onSelectLocation: (locationId: string | null) => void;
  onViewAll: () => void;
  onManageLocations?: () => void;
  onManageOrganization?: () => void;
  onInviteMembers?: () => void;
  onUserProfile?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

interface LocationInfo {
  id: string;
  name: string;
  icon: string;
}

// Map common location IDs to icons
const getLocationIcon = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('front') || lower.includes('desk') || lower.includes('reception')) return '🏢';
  if (lower.includes('back') || lower.includes('bar')) return '💅';
  if (lower.includes('storage') || lower.includes('warehouse')) return '📦';
  if (lower.includes('office')) return '🏢';
  if (lower.includes('supply') || lower.includes('supplies')) return '📋';
  if (lower.includes('retail') || lower.includes('shop')) return '🛍️';
  return '📍';
};

export const Sidebar: React.FC<SidebarProps> = ({
  selectedLocation,
  onSelectLocation,
  onViewAll,
  onManageLocations,
  onManageOrganization,
  onInviteMembers,
  onUserProfile,
  isOpen,
  onClose,
}) => {
  const [locations, setLocations] = useState<LocationInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLocationsFromInventory = async () => {
      try {
        // Get all inventory levels and extract unique location IDs
        const levels = await getAllFromStore<InventoryLevel>(STORES.inventory_levels);
        const uniqueLocationIds = [...new Set(levels.map(l => l.location_id))];
        
        console.log('[Sidebar] Inventory levels:', levels.length, 'Unique locations:', uniqueLocationIds);
        
        // Create location info from IDs
        // Try to get human-readable names from locations store first
        const locationInfos: LocationInfo[] = [];
        
        for (const id of uniqueLocationIds) {
          // Default: use ID as name (capitalize first letter)
          let name = id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');
          
          // Check if there's a Location record
          try {
            const { STORES } = await import('../../db/schema');
            const { getFromStore } = await import('../../db/database');
            const location = await getFromStore<{ name: string }>(STORES.locations, id);
            console.log('[Sidebar] Looked up location', id, ':', location);
            if (location?.name) {
              name = location.name;
            }
          } catch (e) {
            // No location record, use ID-based name
          }
          
          locationInfos.push({
            id,
            name,
            icon: getLocationIcon(name),
          });
        }
        
        // Sort alphabetically
        locationInfos.sort((a, b) => a.name.localeCompare(b.name));
        
        setLocations(locationInfos);
      } catch (err) {
        console.error('Failed to load locations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLocationsFromInventory();
    
    // Refresh locations when storage changes
    const handleStorage = () => loadLocationsFromInventory();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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

          {/* Divider - Organization */}
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Organization
            </p>
          </div>

          {/* Organization Menu */}
          <button
            onClick={() => {
              onManageOrganization?.();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-gray-700 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Manage Organization</span>
          </button>

          <button
            onClick={() => {
              onInviteMembers?.();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-gray-700 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>Invite Members</span>
          </button>

          {/* Divider - Locations */}
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Locations
            </p>
          </div>

          {/* Location Links */}
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
          ) : locations.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">No locations found</div>
          ) : (
            locations.map((location) => (
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
                <span className="truncate">{location.name}</span>
              </button>
            ))
          )}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={() => {
              onManageLocations?.();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-rose-600 font-medium hover:bg-rose-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Locations
          </button>
          <button
            onClick={() => {
              onUserProfile?.();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            My Profile
          </button>
          <p className="text-xs text-gray-500 text-center">
            Gloss Inventory v1.0
          </p>
        </div>
      </aside>
    </>
  );
};
