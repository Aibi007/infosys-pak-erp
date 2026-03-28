// ================================================================
// src/context/NotificationContext.jsx
// Global toast/notification system.
// Listens for erp:forbidden and erp:ratelimit events from API client.
//
// Usage:
//   const { notify, notifyError } = useNotifications();
//   notify('Invoice confirmed');
//   notifyError('Failed to save');
// ================================================================
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const NotifContext = createContext(null);

const C = {
  bg: '#060a10', border: '#162030', text: '#dce4f0', muted: '#4a6070',
  green: '#10b981', red: '#ef4444', yellow: '#f59e0b', blue: '#3b82f6',
};

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const push = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify      = useCallback((msg) => push(msg, 'success'), [push]);
  const notifyError = useCallback((msg) => push(msg, 'error'),   [push]);
  const notifyWarn  = useCallback((msg) => push(msg, 'warn'),    [push]);
  const notifyInfo  = useCallback((msg) => push(msg, 'info'),    [push]);

  // ── Listen for API client events ─────────────────────────────
  useEffect(() => {
    const onForbidden = (e) => notifyError(e.detail || 'Permission denied');
    const onRateLimit = ()  => notifyWarn('Too many requests — please slow down');
    window.addEventListener('erp:forbidden',  onForbidden);
    window.addEventListener('erp:ratelimit',  onRateLimit);
    return () => {
      window.removeEventListener('erp:forbidden',  onForbidden);
      window.removeEventListener('erp:ratelimit',  onRateLimit);
    };
  }, [notifyError, notifyWarn]);

  const COLOR = { success: C.green, error: C.red, warn: C.yellow, info: C.blue };
  const ICON  = { success: '✓', error: '✕', warn: '⚠', info: 'ℹ' };

  return (
    <NotifContext.Provider value={{ notify, notifyError, notifyWarn, notifyInfo, push, dismiss }}>
      {children}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', top: '14px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '6px',
          alignItems: 'center', pointerEvents: 'none',
        }}>
          {toasts.map((t) => (
            <div
              key={t.id}
              onClick={() => dismiss(t.id)}
              style={{
                background: COLOR[t.type] || C.green,
                color: '#fff',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                fontFamily: 'IBM Plex Sans, sans-serif',
                boxShadow: '0 8px 24px rgba(0,0,0,.5)',
                display: 'flex', alignItems: 'center', gap: '7px',
                cursor: 'pointer',
                pointerEvents: 'all',
                animation: 'erpSlideIn .2s ease',
                whiteSpace: 'nowrap',
                maxWidth: '400px',
              }}
            >
              <span style={{ fontSize: '14px' }}>{ICON[t.type]}</span>
              {t.message}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes erpSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotifications must be inside <NotificationProvider>');
  return ctx;
}
