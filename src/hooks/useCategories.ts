/**
 * useCategories - React hook for category data
 */

import { useState, useEffect, useCallback } from 'react';
import { Category } from '../db/schema';
import { getAllFromStore } from '../db/database';

export interface UseCategoriesResult {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useCategories(organizationId: string): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const allCategories = await getAllFromStore<Category>('categories');
      const filtered = allCategories.filter(
        (c) => c.organization_id === organizationId && !c.deleted_at && c.is_active
      );

      setCategories(filtered);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load categories'));
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    categories,
    isLoading,
    error,
    refresh: loadCategories,
  };
}
