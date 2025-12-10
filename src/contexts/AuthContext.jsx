import React, { createContext, useContext, useEffect, useState } from 'react';
import useAuthStore from '@/stores/authStore';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const {
    user,
    token,
    role,
    isAuthenticated,
    isLoading: storeLoading,
    error,
    login: storeLogin,
    logout: storeLogout,
    register: storeRegister,
    updateProfile: storeUpdateProfile,
    checkAuth,
    refreshAccessToken,
    clearError
  } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const isValid = checkAuth();
        if (!isValid && token) {
          // Token expired, try to refresh
          await refreshAccessToken();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!token) return;

    const refreshInterval = setInterval(
      async () => {
        const isValid = checkAuth();
        if (!isValid) {
          await refreshAccessToken();
        }
      },
      10 * 60 * 1000 // Check every 10 minutes
    );

    return () => clearInterval(refreshInterval);
  }, [token]);

  const login = async (email, password) => {
    try {
      const result = await storeLogin(email, password);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    storeLogout();
  };

  const register = async (userData) => {
    try {
      const result = await storeRegister(userData);
      return result;
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateProfile = async (data) => {
    try {
      await storeUpdateProfile(data);
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    token,
    userRole: role, // Alias for consistency with existing components
    role,
    isAuthenticated,
    isLoading: isLoading || storeLoading,
    error,
    login,
    logout,
    register,
    updateProfile,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
