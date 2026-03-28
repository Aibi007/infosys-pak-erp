// src/api/auth.js — Auth API functions
import { apiPost, tokenStore } from './client';

// ── Login ─────────────────────────────────────────────────────
export async function login(tenantSlug, email, password) {
  // Set tenant slug before login call so header is injected
  tokenStore.setTenant(tenantSlug);
  const res = await apiPost('/auth/login', { email, password });
  tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
  return res.data; // { accessToken, refreshToken, user, tenant }
}

// ── Logout ────────────────────────────────────────────────────
export async function logout() {
  try {
    await apiPost('/auth/logout', { refreshToken: tokenStore.getRefresh() });
  } catch (_) {
    // Best-effort
  } finally {
    tokenStore.clear();
  }
}

// ── Refresh ───────────────────────────────────────────────────
export async function refreshToken() {
  const res = await apiPost('/auth/refresh', {
    refreshToken: tokenStore.getRefresh(),
  });
  tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
  return res.data.accessToken;
}

// ── Change password ───────────────────────────────────────────
export async function changePassword(currentPassword, newPassword) {
  return apiPost('/auth/change-password', { currentPassword, newPassword });
}

// ── Profile ───────────────────────────────────────────────────
export async function getProfile() {
  const { apiGet } = await import('./client');
  return apiGet('/auth/me');
}
