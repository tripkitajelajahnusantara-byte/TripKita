export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? '/api/v1'
    : 'http://localhost:8080/api/v1');

export function getProviderToken(): string | null {
  const sessionToken = sessionStorage.getItem('tementrip_partner_token');
  if (sessionToken) return sessionToken;

  const legacyToken = localStorage.getItem('tementrip_partner_token') ||
    localStorage.getItem('tripkita_partner_token') ||
    localStorage.getItem('tripkita_provider_token') ||
    localStorage.getItem('tripkita_token') ||
    localStorage.getItem('provider_token') ||
    localStorage.getItem('token');
  if (legacyToken) {
    removeProviderToken();
    sessionStorage.setItem('tementrip_partner_token', legacyToken);
  }
  return legacyToken;
}

export function setProviderToken(token: string) {
	removeProviderToken();
	sessionStorage.setItem('tementrip_partner_token', token);
}

export function removeProviderToken() {
	sessionStorage.removeItem('tementrip_partner_token');
  localStorage.removeItem('tementrip_partner_token');
  localStorage.removeItem('tripkita_partner_token');
  localStorage.removeItem('tripkita_provider_token');
  localStorage.removeItem('tripkita_token');
  localStorage.removeItem('provider_token');
  localStorage.removeItem('token');
}

export function getCustomerToken(): string | null {
  const sessionToken = sessionStorage.getItem('tementrip_customer_token');
  if (sessionToken) return sessionToken;

  const legacyToken = localStorage.getItem('tementrip_customer_token') ||
	localStorage.getItem('tripkita_customer_token') ||
	localStorage.getItem('customer_token');
  if (legacyToken) {
	removeCustomerToken();
	sessionStorage.setItem('tementrip_customer_token', legacyToken);
  }
  return legacyToken;
}

export function setCustomerToken(token: string) {
	removeCustomerToken();
	sessionStorage.setItem('tementrip_customer_token', token);
}

export function removeCustomerToken() {
	sessionStorage.removeItem('tementrip_customer_token');
  localStorage.removeItem('tementrip_customer_token');
  localStorage.removeItem('tripkita_customer_token');
  localStorage.removeItem('customer_token');
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

export async function getProtectedDocumentURL(scope: 'provider' | 'admin', documentPath: string): Promise<string> {
  const token = getProviderToken();
  if (!token) {
    throw new Error('Sesi login tidak ditemukan');
  }

  const response = await fetch(`${API_BASE_URL}/${scope}/documents?path=${encodeURIComponent(documentPath)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Dokumen tidak dapat dibuka');
  }
  return URL.createObjectURL(await response.blob());
}

export async function openProtectedDocument(scope: 'provider' | 'admin', documentPath: string): Promise<void> {
  const objectURL = await getProtectedDocumentURL(scope, documentPath);
  openObjectURL(objectURL);
}

export async function openProtectedFile(endpoint: string): Promise<void> {
  const token = getProviderToken();
  if (!token) throw new Error('Sesi login tidak ditemukan');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'File tidak dapat dibuka');
  }
  openObjectURL(URL.createObjectURL(await response.blob()));
}

function openObjectURL(objectURL: string): void {
  const link = document.createElement('a');
  link.href = objectURL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectURL), 60_000);
}

