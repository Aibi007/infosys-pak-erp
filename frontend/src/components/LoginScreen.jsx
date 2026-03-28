// ================================================================
// src/components/LoginScreen.jsx
// Production login screen for Infosys Pak ERP.
// Handles: tenant slug + email + password → JWT login
// ================================================================
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const C = {
  bg: '#040810', panel: '#080e18', card: '#0b1420', border: '#132030',
  text: '#dce4f0', muted: '#4a6070', accent: '#f97316', blue: '#3b82f6',
  green: '#10b981', red: '#ef4444', input: '#060d18',
};

export default function LoginScreen() {
  const { login } = useAuth();
  const { notifyError } = useNotifications();
  const [form, setForm] = useState({
    tenantSlug: localStorage.getItem('erp_last_tenant') || '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleLogin(e) {
    e.preventDefault();
    if (!form.tenantSlug || !form.email || !form.password) {
      notifyError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(form.tenantSlug.trim().toLowerCase(), form.email.trim(), form.password);
      localStorage.setItem('erp_last_tenant', form.tenantSlug.trim().toLowerCase());
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Check your credentials.';
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  }

  const inp = {
    width: '100%', background: C.input, border: `1px solid ${C.border}`,
    borderRadius: '8px', padding: '10px 12px', color: C.text, fontSize: '13px',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color .15s',
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Sans', sans-serif", color: C.text,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input { font-family: inherit; }
        input:focus { border-color: ${C.blue} !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, opacity: .04,
        backgroundImage: `linear-gradient(${C.accent} 1px, transparent 1px),
                          linear-gradient(90deg, ${C.accent} 1px, transparent 1px)`,
        backgroundSize: '60px 60px', pointerEvents: 'none',
      }} />

      <div style={{
        width: '420px', background: C.card, border: `1px solid ${C.border}`,
        borderRadius: '16px', padding: '36px 32px', margin: '20px',
        animation: 'fadeUp .3s ease', position: 'relative',
        boxShadow: '0 32px 80px rgba(0,0,0,.6)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '900', fontSize: '18px', color: '#fff',
            margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(249,115,22,.3)',
          }}>IP</div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: C.text }}>
            Infosys Pak ERP
          </div>
          <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>
            Multi-tenant Business Management System
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Tenant Slug */}
          <div>
            <label style={{ fontSize: '10px', color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: '5px' }}>
              Company Slug
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: C.muted }}>🏢</span>
              <input
                value={form.tenantSlug}
                onChange={(e) => upd('tenantSlug', e.target.value)}
                placeholder="e.g. albaraka_textiles"
                style={{ ...inp, paddingLeft: '32px' }}
                autoComplete="organization"
                autoFocus
              />
            </div>
            <div style={{ fontSize: '9px', color: C.muted, marginTop: '3px' }}>
              Your company's unique identifier (lowercase, underscores)
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize: '10px', color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: '5px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: C.muted }}>✉</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => upd('email', e.target.value)}
                placeholder="you@company.pk"
                style={{ ...inp, paddingLeft: '32px' }}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: '10px', color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: '5px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: C.muted }}>🔒</span>
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => upd('password', e.target.value)}
                placeholder="Your password"
                style={{ ...inp, paddingLeft: '32px', paddingRight: '40px' }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '14px', padding: '2px',
                }}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
              background: loading ? '#1a2a3a' : 'linear-gradient(135deg, #f97316, #ea580c)',
              color: loading ? C.muted : '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: '800', fontFamily: 'inherit',
              marginTop: '4px', transition: 'opacity .15s',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(249,115,22,.3)',
            }}
          >
            {loading ? '⏳ Signing in...' : '→ Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: C.muted }}>
          FBR Compliant · Multi-Tenant · Secure · Made in Pakistan 🇵🇰
        </div>
      </div>
    </div>
  );
}
