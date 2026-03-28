// ================================================================
// src/api/client.js
// Axios API client — handles:
//   - Base URL + content-type headers
//   - X-Tenant-Slug header injection
//   - Authorization: Bearer <token>
//   - 401 → refresh token → retry
//   - 403 → permission denied toast
//   - Token storage (localStorage)
//
// Usage:
//   import api from './api/client';
//   const data = await api.get('/products');
// ================================================================

import axios from 'axios';

// ── Constants ─────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.erp.pk/api/v1';
const TOKEN_KEY    = 'erp_access_token';
const REFRESH_KEY  = 'erp_refresh_token';
const TENANT_KEY   = 'erp_tenant_slug';

// ── Token helpers ─────────────────────────────────────────────
export const tokenStore = {
  getAccess:   ()  => localStorage.getItem(TOKEN_KEY),
  getRefresh:  ()  => localStorage.getItem(REFRESH_KEY),
  getTenant:   ()  => localStorage.getItem(TENANT_KEY),
  setTokens:   (access, refresh) => {
    localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  setTenant:   (slug) => localStorage.setItem(TENANT_KEY, slug),
  clear:       ()  => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(TENANT_KEY);
  },
};

// ── Axios instance ────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ── Request interceptor — inject auth + tenant headers ────────
api.interceptors.request.use(
  (config) => {
    const token  = tokenStore.getAccess();
    const tenant = tokenStore.getTenant();
    if (token)  config.headers['Authorization'] = `Bearer ${token}`;
    if (tenant) config.headers['X-Tenant-Slug'] = tenant;
    return config;
  },
  (err) => Promise.reject(err)
);

// ── Token refresh state ───────────────────────────────────────
let isRefreshing   = false;
let refreshQueue   = [];

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  refreshQueue = [];
}

// ── Response interceptor — handle 401 refresh + 403 ──────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const orig = error.config;

    // ── 401: Try token refresh once ───────────────────────────
    if (error.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            orig.headers['Authorization'] = `Bearer ${token}`;
            return api(orig);
          })
          .catch((err) => Promise.reject(err));
      }

      orig._retry   = true;
      isRefreshing  = true;

      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) {
        // No refresh token — force logout
        tokenStore.clear();
        window.dispatchEvent(new Event('erp:logout'));
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        const newAccess = data.data.accessToken;
        tokenStore.setTokens(newAccess, data.data.refreshToken);
        api.defaults.headers['Authorization'] = `Bearer ${newAccess}`;
        processQueue(null, newAccess);
        orig.headers['Authorization'] = `Bearer ${newAccess}`;
        return api(orig);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStore.clear();
        window.dispatchEvent(new Event('erp:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 403: Permission denied ────────────────────────────────
    if (error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('erp:forbidden', {
        detail: error.response.data?.error || 'Permission denied',
      }));
    }

    // ── 429: Rate limited ─────────────────────────────────────
    if (error.response?.status === 429) {
      window.dispatchEvent(new CustomEvent('erp:ratelimit'));
    }

    return Promise.reject(error);
  }
);

export default api;

// ── Convenience wrappers that unwrap .data ─────────────────────
export const apiGet    = (url, params) =>
  api.get(url, { params }).then((r) => r.data);

export const apiPost   = (url, body) =>
  api.post(url, body).then((r) => r.data);

export const apiPut    = (url, body) =>
  api.put(url, body).then((r) => r.data);

export const apiPatch  = (url, body) =>
  api.patch(url, body).then((r) => r.data);

export const apiDelete = (url) =>
  api.delete(url).then((r) => r.data);
