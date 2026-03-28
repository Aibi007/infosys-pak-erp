// ================================================================
// src/components/UserMenu.jsx
// User profile dropdown component for the app shell header.
// Shows: avatar, user name, role badge, tenant name, logout.
// ================================================================
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { ROLE_LABELS, ROLE_COLORS } from '../utils/rbacIntegration';

const C = {
  bg: '#060a10', panel: '#090f1a', card: '#0d1825', border: '#162030',
  border2: '#1e2e40', text: '#dce4f0', muted: '#4a6070', accent: '#f97316',
  red: '#ef4444', green: '#10b981',
};

export default function UserMenu() {
  const { user, tenant, logout, isSuperAdmin } = useAuth();
  const { notify } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleLogout() {
    setOpen(false);
    await logout();
    notify('Logged out successfully');
  }

  if (!user) return null;

  const role     = user.role?.toLowerCase() || 'viewer';
  const roleLabel = isSuperAdmin ? 'Super Admin' : (ROLE_LABELS[role] || role);
  const roleColor = isSuperAdmin ? C.accent : (ROLE_COLORS[role] || C.muted);
  const initials  = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: open ? `${C.border2}` : 'transparent',
          border: `1px solid ${open ? C.border2 : 'transparent'}`,
          borderRadius: '8px', padding: '5px 10px 5px 5px',
          cursor: 'pointer', color: C.text, fontFamily: 'inherit',
          transition: 'all .15s',
        }}
      >
        <div style={{
          width: '28px', height: '28px', borderRadius: '7px',
          background: `linear-gradient(135deg, ${roleColor}, ${roleColor}bb)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '900', fontSize: '10px', color: '#fff', flexShrink: 0,
        }}>{initials}</div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: C.text, lineHeight: 1.2 }}>
            {user.name || user.email}
          </div>
          <div style={{ fontSize: '9px', color: roleColor, fontWeight: '700' }}>
            {roleLabel}
          </div>
        </div>
        <span style={{ fontSize: '9px', color: C.muted, marginLeft: '2px' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: '6px',
          background: C.panel, border: `1px solid ${C.border2}`,
          borderRadius: '10px', width: '220px', zIndex: 500,
          boxShadow: '0 12px 40px rgba(0,0,0,.6)',
          animation: 'erpSlideIn .15s ease',
          overflow: 'hidden',
        }}>
          {/* Profile block */}
          <div style={{
            padding: '12px 14px', borderBottom: `1px solid ${C.border}`,
            background: `linear-gradient(135deg, ${roleColor}0c, transparent)`,
          }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: C.text }}>
              {user.name || user.email}
            </div>
            <div style={{ fontSize: '10px', color: C.muted, marginTop: '1px' }}>
              {user.email}
            </div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '6px' }}>
              <span style={{
                fontSize: '9px', fontWeight: '700', padding: '2px 7px',
                borderRadius: '10px', background: `${roleColor}18`,
                color: roleColor, border: `1px solid ${roleColor}28`,
              }}>{roleLabel}</span>
              {tenant && (
                <span style={{
                  fontSize: '9px', fontWeight: '700', padding: '2px 7px',
                  borderRadius: '10px', background: `${C.accent}18`,
                  color: C.accent, border: `1px solid ${C.accent}28`,
                }}>{tenant.name || tenant.slug}</span>
              )}
            </div>
          </div>

          {/* Menu items */}
          {[
            { icon: '👤', label: 'My Profile',       action: () => {} },
            { icon: '🔑', label: 'Change Password',   action: () => {} },
            { icon: '⚙',  label: 'Settings',          action: () => {} },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { item.action(); setOpen(false); }}
              style={{
                width: '100%', padding: '9px 14px', background: 'transparent',
                border: 'none', color: C.text, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '12px', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'background .1s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = C.card}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '13px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          {/* Divider */}
          <div style={{ height: '1px', background: C.border, margin: '2px 0' }} />

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '9px 14px', background: 'transparent',
              border: 'none', color: C.red, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '12px', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'background .1s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = `${C.red}0e`}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: '13px' }}>→</span>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
