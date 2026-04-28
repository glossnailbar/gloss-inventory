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

      console.log('[useProducts] Loading products for org:', organizationId.substring(0,8));

      // Load from IndexedDB (works offline)
      const basicProducts = await getProductsByOrganization(organizationId);
      console.log('[useProducts] Basic products loaded:', basicProducts.length);

      // Enrich with inventory data
      const withInventory = await Promise.all(
        basicProducts.map(async (product) => {
          return getProductWithInventory(product.local_id);
        })
      );

      const filtered = withInventory.filter((p): p is ProductWithInventory => !!p);
      console.log('[useProducts] Products with inventory:', filtered.length);
      console.log('[useProducts] First product:', filtered[0]?.name, 'qty:', filtered[0]?.total_quantity);

      setProducts(filtered);
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
