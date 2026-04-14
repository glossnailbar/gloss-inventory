/**
 * useLocations - Hook to fetch locations from IndexedDB
 */

import { useState, useEffect } from 'react';
import { getAllFromStore } from '../db/database';
import { STORES, Location } from '../db/schema';

export function useLocations(organizationId: string) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoading(true);
        const allLocations = await getAllFromStore<Location>(STORES.locations);
        // Filter by organization if needed
        const filtered = allLocations.filter(
          loc => !loc.organization_id || loc.organization_id === organizationId
        );
        setLocations(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load locations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, [organizationId]);

  return { locations, isLoading, error };
}
