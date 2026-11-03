import { Product, Organization, DashboardData, SystemInfo, User } from '../types';

const TOKEN_KEY = 'stockflow_auth_token';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  remove: (): void => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}: ${response.statusText}`);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    organizationName: string;
  }) =>
    request<{
      success: boolean;
      token: string;
      user: User;
      organization: Organization;
      message: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{
      success: boolean;
      token: string;
      user: User;
      organization: Organization;
      message: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () =>
    request<{
      success: boolean;
      user: User;
      organization: Organization;
    }>('/api/auth/me'),

  logout: () =>
    request<{ success: boolean; message: string }>('/api/auth/logout', {
      method: 'POST',
    }),

  // Organization Settings
  getOrganization: () =>
    request<{ success: boolean; organization: Organization }>('/api/organization'),

  updateOrganization: (payload: {
    name: string;
    currency: string;
    defaultLowStockThreshold: number;
    email?: string;
  }) =>
    request<{
      success: boolean;
      organization: Organization;
      message: string;
    }>('/api/organization', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Products
  getProducts: (params?: { search?: string; status?: string; sortBy?: string; sortOrder?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<{ success: boolean; count: number; products: Product[] }>(`/api/products${queryString}`);
  },

  getProduct: (id: string) =>
    request<{ success: boolean; product: Product }>(`/api/products/${id}`),

  createProduct: (payload: {
    name: string;
    sku: string;
    description?: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    lowStockThreshold?: number | null;
  }) =>
    request<{ success: boolean; product: Product; message: string }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProduct: (
    id: string,
    payload: {
      name: string;
      sku: string;
      description?: string;
      quantity?: number;
      costPrice: number;
      sellingPrice: number;
      lowStockThreshold?: number | null;
    }
  ) =>
    request<{ success: boolean; product: Product; message: string }>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteProduct: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/products/${id}`, {
      method: 'DELETE',
    }),

  adjustStock: (
    id: string,
    payload: {
      adjustmentType: 'add' | 'subtract' | 'set';
      amount?: number;
      newQuantity?: number;
      reason?: string;
    }
  ) =>
    request<{ success: boolean; product: Partial<Product>; message: string }>(`/api/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Dashboard
  getDashboard: () => request<DashboardData>('/api/dashboard'),

  // System & Architecture Info
  getSystemInfo: () => request<SystemInfo>('/api/system/info'),
};
