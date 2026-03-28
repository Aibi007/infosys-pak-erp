// src/components/ChangePasswordModal.jsx
import { useState } from 'react';
import { changePassword } from '../api/auth';
import { useNotifications } from '../context/NotificationContext';

const C = {
  card: '#0d1825', panel: '#090f1a', border: '#162030', text: '#dce4f0',
  muted: '#4a6070', accent: '#f97316', green: '#10b981', red: '#ef4444',
  blue: '#3b82f6', input: '#060d18',
};

export default function ChangePasswordModal({ onClose }) {
  const { notify, notifyError } = useNotifications();
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const inp = {
    width: '100%', background: C.input, border: `1px solid ${C.border}`,
    borderRadius: '7px', padding: '9px 11px', color: C.text, fontSize: '12px',
    outline: 'none', fontFamily: 'inherit',
  };

  async function handleSubmit() {
    if (!form.current || !form.newPass) return notifyError('Please fill all fields');
    if (form.newPass.length < 8)        return notifyError('New password must be at least 8 characters');
    if (form.newPass !== form.confirm)  return notifyError('New passwords do not match');
    setLoading(true);
    try {
      await changePassword(form.current, form.newPass);
      notify('Password changed successfully');
      onClose();
    } catch (err) {
      notifyError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400,
      fontFamily: 'IBM Plex Sans, sans-serif',
    }}>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px',
        width: '380px', overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: C.panel,
        }}>
          <div style={{ fontWeight: '800', fontSize: '14px', color: C.text }}>Change Password</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            ['current', 'Current Password'],
            ['newPass', 'New Password'],
            ['confirm', 'Confirm New Password'],
          ].map(([k, label]) => (
            <div key={k}>
              <label style={{ fontSize: '9px', color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: '4px' }}>{label}</label>
              <input
                type="password"
                value={form[k]}
                onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                style={inp}
                onFocus={(e) => e.target.style.borderColor = C.blue}
                onBlur={(e) => e.target.style.borderColor = C.border}
              />
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '7px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '8px', borderRadius: '7px', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: '8px 18px', borderRadius: '7px', border: 'none', background: loading ? '#1a2a3a' : C.green, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700' }}
          >
            {loading ? '...' : '✓ Update'}
          </button>
        </div>
      </div>
    </div>
  );
}
