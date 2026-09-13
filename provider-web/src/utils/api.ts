export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? '/api/v1'
    : 'http://localhost:8080/api/v1');


export function getProviderToken(): string | null {
  return localStorage.getItem('tementrip_partner_token') ||
         localStorage.getItem('tripkita_partner_token') ||
         localStorage.getItem('tripkita_provider_token') ||
         localStorage.getItem('tripkita_token') ||
         localStorage.getItem('provider_token') ||
         localStorage.getItem('token');
}

export function setProviderToken(token: string) {
  localStorage.setItem('tementrip_partner_token', token);
  localStorage.setItem('tripkita_partner_token', token);
  localStorage.setItem('tripkita_provider_token', token);
  localStorage.setItem('tripkita_token', token);
}

export function removeProviderToken() {
  localStorage.removeItem('tementrip_partner_token');
  localStorage.removeItem('tripkita_partner_token');
  localStorage.removeItem('tripkita_provider_token');
  localStorage.removeItem('tripkita_token');
  localStorage.removeItem('provider_token');
  localStorage.removeItem('token');
}

export function getCustomerToken(): string | null {
  return localStorage.getItem('tementrip_customer_token') ||
         localStorage.getItem('tripkita_customer_token') ||
         localStorage.getItem('customer_token');
}

export function setCustomerToken(token: string) {
  localStorage.setItem('tementrip_customer_token', token);
  localStorage.setItem('tripkita_customer_token', token);
}

export function removeCustomerToken() {
  localStorage.removeItem('tementrip_customer_token');
  localStorage.removeItem('tripkita_customer_token');
  localStorage.removeItem('customer_token');
}

export function getAuthToken(): string | null {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  if (hash.startsWith('#/provider/') || hash.startsWith('#/admin/')) {
    return getProviderToken();
  }
  return getCustomerToken();
}

export function setAuthToken(token: string, role?: string) {
  if (role === 'CUSTOMER') {
    setCustomerToken(token);
  } else {
    setProviderToken(token);
  }
}

export function removeAuthToken() {
  removeProviderToken();
  removeCustomerToken();
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function request(endpoint: string, options: RequestInit = {}) {
  let token: string | null = null;
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const isProviderRoute = hash.startsWith('#/provider/') || hash.startsWith('#/admin/');

  // Decide which token to attach based on endpoint or current route
  if (endpoint.startsWith('/provider/profile')) {
    token = isProviderRoute ? getProviderToken() : getCustomerToken();
  } else if (endpoint.startsWith('/provider') || endpoint.startsWith('/admin')) {
    token = getProviderToken();
  } else if (endpoint.startsWith('/customer')) {
    token = getCustomerToken();
  } else {
    token = getCustomerToken() || (isProviderRoute ? getProviderToken() : null);
  }

  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json().catch(() => { throw new Error('Respons server tidak valid. Silakan coba lagi.'); });
}


export function getUploadUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith('/uploads/') && !path.startsWith('uploads/')) return undefined;
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '') + '/' + path.replace(/^\//, '');
}
