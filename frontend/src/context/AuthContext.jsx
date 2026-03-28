// ================================================================
// src/context/AuthContext.jsx
// Global auth state + RBAC permission checker.
//
// Provides:
//   useAuth()        — { user, tenant, login, logout, can, isSuperAdmin }
//   can('sales:create')  → boolean
//   hasRole('manager')   → boolean
//
// Auto-restores session from localStorage on app load.
// Listens for erp:logout events (fired by API client on 401).
// ================================================================
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { login as apiLogin, logout as apiLogout } from '../api/auth';
import { tokenStore } from '../api/client';
import { apiGet } from '../api/client';

const AuthContext = createContext(null);

// ── Permission definitions per role ───────────────────────────
// These mirror the backend RBAC config in src/middleware/auth.js
const ROLE_PERMISSIONS = {
  owner: ['*'],   // all permissions
  admin: ['*'],
  manager: [
    'pos:read', 'pos:create',
    'inventory:read', 'inventory:create', 'inventory:update', 'inventory:adjust', 'inventory:transfer',
    'sales:read', 'sales:create', 'sales:delete',
    'procurement:read', 'procurement:create', 'procurement:approve',
    'accounting:read', 'accounting:create', 'accounting:close',
    'hr:read', 'hr:create', 'hr:update', 'hr:payroll',
    'reports:read', 'reports:fbr',
    'settings:read', 'settings:update',
  ],
  accountant: [
    'accounting:read', 'accounting:create', 'accounting:close',
    'sales:read', 'procurement:read',
    'reports:read', 'reports:fbr',
    'inventory:read',
  ],
  cashier: [
    'pos:read', 'pos:create',
    'sales:read', 'inventory:read',
    'reports:read',
  ],
  salesperson: [
    'pos:read', 'pos:create',
    'sales:read', 'inventory:read',
  ],
  warehouse: [
    'inventory:read', 'inventory:adjust', 'inventory:transfer',
    'procurement:read',
  ],
  hr_officer: [
    'hr:read', 'hr:create', 'hr:update', 'hr:payroll',
    'reports:read',
  ],
  viewer: [
    'pos:read', 'inventory:read', 'sales:read',
    'accounting:read', 'hr:read', 'procurement:read',
    'reports:read',
  ],
};

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [tenant,  setTenant]  = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session on mount ────────────────────────────────
  useEffect(() => {
    async function restoreSession() {
      const token  = tokenStore.getAccess();
      const slug   = tokenStore.getTenant();
      if (!token || !slug) { setLoading(false); return; }
      try {
        const res = await apiGet('/auth/me');
        setUser(res.data.user);
        setTenant(res.data.tenant);
      } catch {
        tokenStore.clear();
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  // ── Listen for forced logout (401) ──────────────────────────
  useEffect(() => {
    const handler = () => { setUser(null); setTenant(null); };
    window.addEventListener('erp:logout', handler);
    return () => window.removeEventListener('erp:logout', handler);
  }, []);

  // ── Login ───────────────────────────────────────────────────
  const login = useCallback(async (tenantSlug, email, password) => {
    const data = await apiLogin(tenantSlug, email, password);
    setUser(data.user);
    setTenant(data.tenant);
    return data;
  }, []);

  // ── Logout ──────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setTenant(null);
  }, []);

  // ── Permission check ────────────────────────────────────────
  const can = useCallback((permission) => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    const role = user.role?.toLowerCase() || 'viewer';
    const perms = ROLE_PERMISSIONS[role] || [];
    if (perms.includes('*')) return true;
    // Support wildcard: 'sales:*' matches 'sales:read', 'sales:create' etc
    return perms.some((p) => {
      if (p === permission) return true;
      const [pModule, pAction] = p.split(':');
      const [rModule, rAction] = permission.split(':');
      return pModule === rModule && (pAction === '*' || rAction === pAction);
    });
  }, [user]);

  // ── Role check ──────────────────────────────────────────────
  const hasRole = useCallback((role) => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return user.role?.toLowerCase() === role.toLowerCase();
  }, [user]);

  const isSuperAdmin = user?.isSuperAdmin === true;

  const value = useMemo(() => ({
    user, tenant, loading, login, logout, can, hasRole, isSuperAdmin,
    isLoggedIn: !!user,
  }), [user, tenant, loading, login, logout, can, hasRole, isSuperAdmin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
