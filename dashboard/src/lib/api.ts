// API configuration - Multi-tenant SaaS
// In development: uses http://localhost:3001/api
// In production:  uses the VITE_API_URL environment variable set in Vercel
const PROD_API_URL = 'https://property-manager-production-a304.up.railway.app/api';
const API_BASE_URL = import.meta.env.VITE_API_URL || PROD_API_URL;

// Get stored auth token
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Helper function for authenticated fetch requests
async function fetchAPI(endpoint: string, options?: RequestInit) {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options?.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    if (response.status === 402) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Subscription required');
    }

    if (!response.ok) {
      let errorMessage = `API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
        if (errorData.details) errorMessage += ': ' + errorData.details.join(', ');
      } catch {}
      throw new Error(errorMessage);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// API functions
export const api = {
  // Dashboard Stats
  getDashboardStats: () => fetchAPI('/dashboard/stats'),
  
  // Properties
  getProperties: () => fetchAPI('/properties'),
  getProperty: (id: string) => fetchAPI(`/properties/${id}`),
  createProperty: (property: any) => fetchAPI('/properties', {
    method: 'POST',
    body: JSON.stringify(property),
  }),
  updateProperty: (id: string | number, property: any) => fetchAPI(`/properties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(property),
  }),
  deleteProperty: (id: string | number) => fetchAPI(`/properties/${id}`, {
    method: 'DELETE',
  }),
  
  // Maintenance
  getMaintenance: () => fetchAPI('/maintenance'),
  
  // Financials
  getRevenue: () => fetchAPI('/financials/revenue'),
  getFinancialSummary: () => fetchAPI('/financials/summary'),
  getTaxSummary: (year?: string) => fetchAPI(`/financials/tax-summary${year ? `?year=${year}` : ''}`),
  
  // Dashboard chart (real data)
  getDashboardChartData: () => fetchAPI('/dashboard/chart-data'),
  
  // Expenses
  getExpenses: () => fetchAPI('/expenses'),
  createExpense: (expense: any) => fetchAPI('/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  }),
  updateExpense: (id: string, expense: any) => fetchAPI(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(expense),
  }),
  deleteExpense: (id: string) => fetchAPI(`/expenses/${id}`, {
    method: 'DELETE',
  }),
  
  // Rent Roll
  getRentRoll: (month?: string, year?: string) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    const query = params.toString();
    return fetchAPI(`/rent-roll${query ? `?${query}` : ''}`);
  },
  createRentEntry: (entry: any) => fetchAPI('/rent-roll', {
    method: 'POST',
    body: JSON.stringify(entry),
  }),
  updateRentEntry: (id: string, entry: any) => fetchAPI(`/rent-roll/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entry),
  }),
  deleteRentEntry: (id: string) => fetchAPI(`/rent-roll/${id}`, {
    method: 'DELETE',
  }),
  generateRentRoll: () => fetchAPI('/rent-roll/generate', { method: 'POST' }),
  
  // Tenants
  getTenants: () => fetchAPI('/tenants'),
  getTenant: (id: string) => fetchAPI(`/tenants/${id}`),
  createTenant: (tenant: any) => fetchAPI('/tenants', { method: 'POST', body: JSON.stringify(tenant) }),
  updateTenant: (id: string, tenant: any) => fetchAPI(`/tenants/${id}`, { method: 'PUT', body: JSON.stringify(tenant) }),
  deleteTenant: (id: string) => fetchAPI(`/tenants/${id}`, { method: 'DELETE' }),
  getTenantPortalLink: (id: string) => fetchAPI(`/tenants/${id}/portal-link`),

  // Vendors
  getVendors: () => fetchAPI('/vendors'),
  
  // Clients
  getClients: () => fetchAPI('/clients'),
  
  // Documents
  getDocuments: () => fetchAPI('/documents'),
  getDocument: (filename: string) => fetchAPI(`/documents/file/${filename}`),
  
  // Payments
  getPayments: () => fetchAPI('/payments'),
  getPaymentsByTenant: (tenantId: string) => fetchAPI(`/payments/tenant/${tenantId}`),
  getPaymentsByProperty: (propertyId: string) => fetchAPI(`/payments/property/${propertyId}`),
  getPaymentStats: () => fetchAPI('/payments/stats'),
  createCheckoutSession: (data: { 
    tenantId: string; 
    propertyId: string; 
    amount: number; 
    type: 'rent' | 'deposit' | 'late_fee';
    description?: string;
  }) => fetchAPI('/payments/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createPaymentLink: (data: { 
    tenantId: string; 
    propertyId: string; 
    amount: number; 
    type: 'rent' | 'deposit' | 'late_fee';
    description?: string;
  }) => fetchAPI('/payments/create-payment-link', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Subscription
  getSubscription: () => fetchAPI('/subscription'),
  createSubscriptionCheckout: (data: { tier: string; billing_period: 'monthly' | 'annual' }) =>
    fetchAPI('/subscription/create-checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  openBillingPortal: () =>
    fetchAPI('/subscription/portal', { method: 'POST' }),

  // Team Management
  getTeam: () => fetchAPI('/auth/team'),
  inviteTeamMember: (data: { email: string; full_name: string; role: string }) =>
    fetchAPI('/auth/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeTeamMember: (userId: string) =>
    fetchAPI(`/auth/team/${userId}`, { method: 'DELETE' }),

  // Profile
  updateProfile: (data: { full_name?: string; email?: string; current_password?: string; new_password?: string }) =>
    fetchAPI('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export default api;
