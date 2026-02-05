import React, { createContext, useContext, useEffect, useState } from 'react';
import useAuthStore from '@/stores/authStore.secure';

interface User {
  id: string;
  email?: string;
  phone?: string;
  full_name: string;
  role: string;
  status: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  profile_picture?: string;
}

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  register: (userData: any) => Promise<any>;
  updateProfile: (data: any) => Promise<any>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }) {
  const {
    user,
    role,
    isAuthenticated,
    isLoading: storeLoading,
    hasHydrated,
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
  const [hasInitialized, setHasInitialized] = useState(false);

  // Check authentication on mount - only after hydration and only once
  useEffect(() => {
    if (!hasHydrated) return; // Wait for Zustand to rehydrate from localStorage
    if (hasInitialized) return; // Only run once

    const initAuth = async () => {
      setHasInitialized(true);
      try {
        // For cookie-based auth, just check if we can get current user
        await checkAuth();
      } catch (error) {
        // Silently handle - user is not authenticated
        console.debug('Auth initialization: user not authenticated');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [hasHydrated, hasInitialized, checkAuth]);

  // Auto-refresh token before expiry (for cookie-based auth)
  useEffect(() => {
    // Only set up refresh interval if user is authenticated and initialization is complete
    if (!isAuthenticated || !hasInitialized || isLoading) return;

    const refreshInterval = setInterval(
      async () => {
        try {
          const success = await refreshAccessToken();
          if (!success) {
            // Token refresh failed, user will be logged out by the store
            console.debug('Token refresh failed, user session expired');
          }
        } catch (error) {
          // Silently handle - refreshAccessToken already handles state cleanup
          console.debug('Token refresh error:', error);
        }
      },
      10 * 60 * 1000 // Check every 10 minutes
    );

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, hasInitialized, isLoading, refreshAccessToken]);

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
