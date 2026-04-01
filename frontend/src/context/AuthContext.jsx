import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Bypass login for testing purposes
  const [user, setUser] = useState({ id: 1, name: 'Test User', role: 'admin', permissions: ['*'], isSuperAdmin: true });
  const [tenant, setTenant] = useState({ slug: 'admin', companyName: 'Infosys Pak ERP' });
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [loading, setLoading] = useState(false);

  return (
    <AuthContext.Provider value={{ user, tenant, isAuthenticated, loading, login: () => {}, logout: () => {} }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
