/**
 * useProducts - React hook for product data with IndexedDB caching
 *
 * Works offline, syncs in background.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ProductWithInventory,
  getProductsByOrganization,
  getProductWithInventory,
} from '../db/operations/products';

export interface UseProductsResult {
  products: ProductWithInventory[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getById: (localId: string) => Promise<ProductWithInventory | undefined>;
}

export function useProducts(organizationId: string): UseProductsResult {
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load from IndexedDB (works offline)
      const basicProducts = await getProductsByOrganization(organizationId);

      // Enrich with inventory data
      const withInventory = await Promise.all(
        basicProducts.map(async (product) => {
          return getProductWithInventory(product.local_id);
        })
      );

      setProducts(withInventory.filter((p): p is ProductWithInventory => !!p));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load products'));
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const getById = useCallback(
    async (localId: string) => {
      return getProductWithInventory(localId);
    },
    []
  );

  return {
    products,
    isLoading,
    error,
    refresh: loadProducts,
    getById,
  };
}
