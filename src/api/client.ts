/**
 * API Client for Gloss Inventory
 *
 * Connects to Railway backend for sync operations.
 */

import { getAuthToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://gloss-inventory.up.railway.app';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

// Health check
export async function checkHealth(): Promise<{ status: string; timestamp: string } | null> {
  const { data } = await fetchApi<{ status: string; timestamp: string }>('/health');
  return data || null;
}

// Sync operations
export async function pushChanges(
  deviceId: string,
  organizationId: string,
  changes: any[]
): Promise<any> {
  const { data, error } = await fetchApi('/api/sync/push', {
    method: 'POST',
    body: JSON.stringify({ device_id: deviceId, organization_id: organizationId, changes }),
  });
  
  if (error) throw new Error(error);
  return data;
}

export async function pullChanges(
  organizationId: string,
  offset: number
): Promise<any> {
  const { data, error } = await fetchApi(
    `/api/sync/pull?org=${organizationId}&offset=${offset}`
  );
  
  if (error) throw new Error(error);
  return data;
}

// Products
export async function fetchProducts(
  organizationId: string,
  page: number = 1,
  limit: number = 50
): Promise<any> {
  const { data, error } = await fetchApi(
    `/api/products?org=${organizationId}&page=${page}&limit=${limit}`
  );
  
  if (error) throw new Error(error);
  return data;
}

// Categories
export async function fetchCategories(organizationId: string): Promise<any> {
  const { data, error } = await fetchApi(`/api/categories?org=${organizationId}`);
  
  if (error) throw new Error(error);
  return data;
}
