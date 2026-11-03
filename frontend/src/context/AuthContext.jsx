import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize API and fetch user profile if token exists
  useEffect(() => {
    const bootstrapAuth = async () => {
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        try {
          const res = await api.get('/api/auth/profile');

          if (res.data.success) {
            setUser(res.data.user);
          } else {
            logout();
          }
        } catch (error) {
          console.error('Failed to load user profile on startup:', error);
          logout();
        }
      } else {
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
      }

      setLoading(false);
    };

    bootstrapAuth();
  }, [token]);

  // Login action
  const login = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', {
        email,
        password
      });

      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        setUser(res.data.user);

        return { success: true };
      }

      return {
        success: false,
        message: 'Invalid response from server'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check your credentials.'
      };
    }
  };

  // Register action
  const register = async (name, email, password, phone) => {
    try {
      const res = await api.post('/api/auth/register', {
        name,
        email,
        password,
        phone
      });

      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        setUser(res.data.user);

        return { success: true };
      }

      return {
        success: false,
        message: 'Invalid response from server'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed.'
      };
    }
  };

  // Logout action
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  // Update profile details
  const updateProfile = async (profileData) => {
    try {
      const res = await api.put('/api/auth/profile', profileData);

      if (res.data.success) {
        setUser(res.data.user);

        return {
          success: true,
          message: res.data.message
        };
      }

      return {
        success: false,
        message: 'Update failed'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Update failed.'
      };
    }
  };

  // Check authentication
  const checkAuth = async () => {
    if (!token) return null;

    try {
      const res = await api.get('/api/auth/profile');

      if (res.data.success) {
        setUser(res.data.user);
        return res.data.user;
      }

      return null;
    } catch {
      logout();
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateProfile,
        checkAuth,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};