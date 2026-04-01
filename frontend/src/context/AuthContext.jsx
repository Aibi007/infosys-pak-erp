import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api'; // Assuming you have a centralized api utility

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true); // Start with loading true to check session
  const [error, setError] = useState(null);

  // Effect to verify token on initial load
  useEffect(() => {
    const verifySession = async () => {
      if (token) {
        try {
          // The apiFetch utility should automatically use the stored token
          const data = await apiFetch('/auth/me');
          setUser(data.user);
          setTenant(data.tenant);
          setIsLoggedIn(true);
        } catch (err) {
          // Token is invalid or expired
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setTenant(null);
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
      setLoading(false);
    };

    verifySession();
  }, [token]);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', body: credentials });
      const { accessToken, user, tenant } = data.data;
      
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      setUser(user);
      setTenant(tenant);
      setIsLoggedIn(true);
      return true;
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setIsLoggedIn(false);
      return false;
    }
    finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setLoading(true);
    // Invalidate token on the backend
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => {}); // Fire and forget
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setTenant(null);
    setIsLoggedIn(false);
    setLoading(false);
  }, []);

  const value = {
    user,
    tenant,
    isLoggedIn,
    loading,
    error,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
