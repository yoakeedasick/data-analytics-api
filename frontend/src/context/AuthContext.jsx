import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const initAuth = () => {
    const accessToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (accessToken && storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    initAuth();

    // Listen to global logout events triggered by api.js when token refresh fails
    const handleGlobalLogout = () => {
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('auth_logout', handleGlobalLogout);
    return () => {
      window.removeEventListener('auth_logout', handleGlobalLogout);
    };
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token } = response.data;
    
    const loggedUser = { email };
    
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(loggedUser));

    setUser(loggedUser);
    setIsAuthenticated(true);
    return response.data;
  };

  const register = async (email, password, fullName) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
