/**
 * Auth API Client
 * Handles authentication with the backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://gloss-inventory.up.railway.app';

let authToken: string | null = localStorage.getItem('auth_token');

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('auth_token', token);
};

export const getAuthToken = () => authToken;

export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('auth_token');
};

export const isAuthenticated = () => !!authToken;

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  organization: {
    id: string;
    name: string;
    role: string;
  };
}

export const signup = async (data: SignupData): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Signup failed');
  }

  return response.json();
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
};

export const getCurrentUser = async (): Promise<any> => {
  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
    }
    throw new Error('Failed to get user');
  }

  return response.json();
};

// Add auth header to requests
export const authFetch = async (url: string, options: RequestInit = {}) => {
  if (!authToken) {
    throw new Error('Not authenticated');
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${authToken}`,
    },
  });
};
