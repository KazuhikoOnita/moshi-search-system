import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        // Decode JWT token (basic implementation)
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Check if token is expired
        if (payload.exp * 1000 > Date.now()) {
          setUser({
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            token: token
          });
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('auth_token');
      }
    } else {
      // Development mode: auto-login with dummy user
      if (import.meta.env.DEV) {
        console.warn('Development mode: using dummy user');
        setUser({
          email: 'dev@medicmedia.com',
          name: 'Development User',
          picture: '',
          token: 'dev-token'
        });
      }
    }
    setLoading(false);
  }, []);

  const login = () => {
    const API_BASE = import.meta.env.VITE_API_BASE || 'https://moshi-search-api.your-workers-subdomain.workers.dev';
    window.location.href = `${API_BASE}/api/auth/google`;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}