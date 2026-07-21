export const API_BASE_URL = 'http://localhost:8080/api/v1';

export function getAuthToken(): string | null {
  return localStorage.getItem('tripkita_partner_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('tripkita_partner_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('tripkita_partner_token');
}

export async function request(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
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
