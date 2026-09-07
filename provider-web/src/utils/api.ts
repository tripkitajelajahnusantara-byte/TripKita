export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? '/api/v1'
    : 'http://localhost:8080/api/v1');


export function getProviderToken(): string | null {
  return localStorage.getItem('tementrip_partner_token') || localStorage.getItem('tripkita_partner_token');
}

export function setProviderToken(token: string) {
  localStorage.setItem('tementrip_partner_token', token);
  localStorage.setItem('tripkita_partner_token', token);
}

export function removeProviderToken() {
  localStorage.removeItem('tementrip_partner_token');
  localStorage.removeItem('tripkita_partner_token');
}

export function getCustomerToken(): string | null {
  return localStorage.getItem('tementrip_customer_token');
}

export function setCustomerToken(token: string) {
  localStorage.setItem('tementrip_customer_token', token);
}

export function removeCustomerToken() {
  localStorage.removeItem('tementrip_customer_token');
}

export function getAuthToken(): string | null {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  if (hash.includes('/provider') || hash.includes('/admin')) {
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

export async function request(endpoint: string, options: RequestInit = {}) {
  let token: string | null = null;
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const isProviderRoute = hash.includes('/provider') || hash.includes('/admin');

  // Decide which token to attach based on endpoint or current route
  if (endpoint.startsWith('/provider/profile')) {
    token = isProviderRoute ? getProviderToken() : (getCustomerToken() || getProviderToken());
  } else if (endpoint.startsWith('/provider') || endpoint.startsWith('/admin') || isProviderRoute) {
    token = getProviderToken();
  } else if (endpoint.startsWith('/customer')) {
    token = getCustomerToken();
  } else {
    token = getCustomerToken() || (isProviderRoute ? getProviderToken() : null);
  }

  const headers = new Headers(options.headers || {});

  if (token) {
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

  return response.json().catch(() => ({}));
}

