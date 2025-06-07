import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'API request failed');
  }

  return response.json();
}

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    apiRequest<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    apiRequest<{ token: string; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  me: () => apiRequest<{ user: any }>('/api/auth/me'),
};

// Campaigns API
export const campaignsAPI = {
  getAll: () => apiRequest<any[]>('/api/campaigns'),
  getById: (id: string) => apiRequest<any>(`/api/campaigns/${id}`),
  create: (data: any) =>
    apiRequest<any>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    apiRequest<any>(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/api/campaigns/${id}`, {
      method: 'DELETE',
    }),
};

// Creatives API
export const creativesAPI = {
  getAll: () => apiRequest<any[]>('/api/creatives'),
  getById: (id: string) => apiRequest<any>(`/api/creatives/${id}`),
  create: (data: any) =>
    apiRequest<any>('/api/creatives', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    apiRequest<any>(`/api/creatives/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/api/creatives/${id}`, {
      method: 'DELETE',
    }),
};

// Landing Pages API
export const landingPagesAPI = {
  getAll: () => apiRequest<any[]>('/api/landing-pages'),
  getById: (id: string) => apiRequest<any>(`/api/landing-pages/${id}`),
  create: (data: any) =>
    apiRequest<any>('/api/landing-pages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    apiRequest<any>(`/api/landing-pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/api/landing-pages/${id}`, {
      method: 'DELETE',
    }),
};

// Metrics API
export const metricsAPI = {
  getByCampaign: (campaignId: string) =>
    apiRequest<any[]>(`/api/metrics/campaign/${campaignId}`),
  getDashboard: () => apiRequest<any>('/api/metrics/dashboard'),
};

// WhatsApp API
export const whatsappAPI = {
  getConnections: () => apiRequest<any[]>('/api/whatsapp/connections'),
  createConnection: (data: any) =>
    apiRequest<any>('/api/whatsapp/connections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getQRCode: (id: string) => apiRequest<{ qrCode: string }>(`/api/whatsapp/qr/${id}`),
  disconnect: (id: string) =>
    apiRequest<void>(`/api/whatsapp/disconnect/${id}`, {
      method: 'POST',
    }),
};

// Integrations API
export const integrationsAPI = {
  getAll: () => apiRequest<any[]>('/api/integrations'),
  create: (data: any) =>
    apiRequest<any>('/api/integrations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    apiRequest<any>(`/api/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/api/integrations/${id}`, {
      method: 'DELETE',
    }),
};

export { apiRequest }