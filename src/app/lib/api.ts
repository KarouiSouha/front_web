/**
 * FASI API Service
 * Centralized HTTP client with JWT authentication, auto-refresh, and error handling
 */

// Normalise la variable d'environnement `VITE_API_URL`.
// Accepte `VITE_API_URL` avec ou sans `/api` à la fin.
const RAW_API_URL = import.meta.env.VITE_API_URL as string | undefined;
const BACKEND_HOST = RAW_API_URL
  ? RAW_API_URL.replace(/\/api\/?$/i, '')
  : (import.meta.env.DEV ? 'http://localhost:8000' : 'https://fasi-backend.onrender.com');

export const BASE_URL = `${BACKEND_HOST}/api`;
  
function flattenErrorMessages(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(flattenErrorMessages);
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
      const nestedMessages = flattenErrorMessages(nested);
      if (!nestedMessages.length) return [];
      if (key === 'detail' || key === 'message' || key === 'error' || key === 'non_field_errors') {
        return nestedMessages;
      }
      return nestedMessages.map(msg => `${key}: ${msg}`);
    });
  }
  return [];
}

function extractErrorMessage(errorData: unknown, status: number): string {
  const fromCommonFields =
    (errorData as any)?.message ||
    (errorData as any)?.detail ||
    (errorData as any)?.error;

  if (typeof fromCommonFields === 'string' && fromCommonFields.trim()) {
    return fromCommonFields;
  }

  const flattened = flattenErrorMessages(errorData);
  if (flattened.length) {
    return flattened.join(' | ');
  }

  return `Request failed (${status})`;
}

// ─────────────────────────────────────────────
// Token Management
// ─────────────────────────────────────────────

export const TokenStorage = {
  getAccess: () => localStorage.getItem('fasi_access_token'),
  getRefresh: () => localStorage.getItem('fasi_refresh_token'),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem('fasi_access_token', access);
    localStorage.setItem('fasi_refresh_token', refresh);
  },
  setAccess: (access: string) => localStorage.setItem('fasi_access_token', access),
  clear: () => {
    localStorage.removeItem('fasi_access_token');
    localStorage.removeItem('fasi_refresh_token');
    localStorage.removeItem('fasi_user');
  },
};

// ─────────────────────────────────────────────
// Core fetch wrapper with auth + refresh logic
// ─────────────────────────────────────────────

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

async function refreshAccessToken(): Promise<string> {
  const refreshToken = TokenStorage.getRefresh();
  if (!refreshToken) {
    TokenStorage.clear();
    window.location.href = '/login';
    throw new Error('No refresh token available');
  }

  const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!res.ok) {
    TokenStorage.clear();
    window.location.href = '/login';
    throw new Error('Refresh token invalid or expired');
  }

  const data = await res.json();
  TokenStorage.setAccess(data.access);
  return data.access;
}

type RequestOptions = RequestInit & { skipAuth?: boolean };

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers: HeadersInit = {
    ...(fetchOptions.headers || {}),
  };

  // Ajout automatique du token si pas skipAuth
  if (!skipAuth) {
    const token = TokenStorage.getAccess();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  // Ne pas forcer Content-Type pour FormData (upload)
  if (!(fetchOptions.body instanceof FormData)) {
    (headers as Record<string, string>)['Content-Type'] =
      (headers as Record<string, string>)['Content-Type'] || 'application/json';
  }

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'same-origin',
  });

  // Gestion auto-refresh sur 401 (sauf si skipAuth)
  if (response.status === 401 && !skipAuth) {
    if (isRefreshing) {
      // En attente du refresh en cours
      const newToken = await new Promise<string>(resolve => {
        refreshSubscribers.push(resolve);
      });
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { ...fetchOptions, headers });
    } else {
      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        onRefreshed(newToken);
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, { ...fetchOptions, headers });
      } catch (refreshErr) {
        console.error('Refresh token failed:', refreshErr);
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
    }
  }

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText || 'Unknown error' };
    }

    const err = new ApiError(response.status, errorData);

    if (response.status === 401) {
      console.warn('401 Unauthorized - Possible token issue');
    }

    throw err;
  }

  // Réponses vides (DELETE, 204)
  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────
// Public API methods
// ─────────────────────────────────────────────

export const api = {
  get: <T>(endpoint: string, opts?: RequestOptions) =>
    apiFetch<T>(endpoint, { method: 'GET', ...opts }),

  post: <T>(endpoint: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...opts,
    }),

  patch: <T>(endpoint: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...opts,
    }),

  put: <T>(endpoint: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...opts,
    }),

  delete: <T>(endpoint: string, opts?: RequestOptions) =>
    apiFetch<T>(endpoint, { method: 'DELETE', ...opts }),
};

// ─────────────────────────────────────────────
// ApiError (optionnel – pour typer les erreurs)
// ─────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    super(extractErrorMessage(data, status));
    this.status = status;
    this.data = data;
  }
}