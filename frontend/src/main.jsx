// ================================================================
// src/main.jsx
// Application entry point — wires all providers and renders
// LoginScreen or App based on auth state.
// ================================================================
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import LoginScreen from './components/LoginScreen';

// Lazy-load the main app shell to reduce initial bundle size
const AppShell = React.lazy(() => import('./pages/AppShell'));

function Root() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#040810',
        fontFamily: 'IBM Plex Sans, sans-serif', color: '#4a6070',
        fontSize: '13px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '900', fontSize: '14px', color: '#fff',
            margin: '0 auto 12px',
          }}>IP</div>
          <div>Loading Infosys Pak ERP...</div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <React.Suspense fallback={null}>
      <AppShell />
    </React.Suspense>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NotificationProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </NotificationProvider>
  </React.StrictMode>
);
