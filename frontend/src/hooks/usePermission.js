// ================================================================
// src/hooks/usePermission.js
// Permission-gating utilities for components.
//
//   usePermission('sales:create')  → boolean
//   <CanDo permission="hr:update"> ... </CanDo>
//   <RequireAuth>...</RequireAuth>       — redirects to login
//   withPermission(Component, 'hr:*')   — HOC wrapper
// ================================================================
import { useAuth } from '../context/AuthContext';

// ── Hook ──────────────────────────────────────────────────────
export function usePermission(permission) {
  const { can } = useAuth();
  return can(permission);
}

// ── CanDo component — conditional render ──────────────────────
export function CanDo({ permission, fallback = null, children }) {
  const { can } = useAuth();
  return can(permission) ? children : fallback;
}

// ── RequireAuth — shows login screen if not authenticated ──────
export function RequireAuth({ children, loginComponent: Login }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return null; // wait for session restore
  if (!isLoggedIn) return Login ? <Login /> : null;
  return children;
}

// ── withPermission HOC ─────────────────────────────────────────
export function withPermission(Component, permission) {
  return function PermissionGuarded(props) {
    const { can } = useAuth();
    if (!can(permission)) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#4a6070',
          fontFamily: 'IBM Plex Sans, sans-serif',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>Access Denied</div>
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            You don't have permission to access this module.
          </div>
        </div>
      );
    }
    return <Component {...props} />;
  };
}
