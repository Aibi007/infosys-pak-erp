import React from 'react';
import ReactDOM from 'react-dom/client';
import InfosysPakERP from './pages/AppShell'; // Assuming AppShell is your main app component
import { AuthProvider } from './context/AuthContext';

// It's good practice to have a global CSS file for base styles
// import './styles/global.css'; 

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <InfosysPakERP />
    </AuthProvider>
  </React.StrictMode>
);
