import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/stores/authStore.secure';
import { useDataPreCache } from '@/hooks/useDataPreCache';

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
  isOfflineSession: boolean;
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
    isOfflineSession,
    login: storeLogin,
    logout: storeLogout,
    register: storeRegister,
    updateProfile: storeUpdateProfile,
    checkAuth,
    refreshAccessToken,
    clearError
  } = useAuthStore();

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Pre-cache critical data for offline use once the user is authenticated
  useDataPreCache(user?.id, role);

  // Listen for session-expired events from the API interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      // If we're in an offline session, don't log out — the interceptor
      // can fire spuriously when the backend is temporarily unreachable.
      const state = useAuthStore.getState();
      if (state.isOfflineSession) return;

      // Only act if currently on a page other than /login to avoid loops
      if (window.location.pathname === '/login') return;

      storeLogout().then(() => {
        navigate('/login', { replace: true });
      });
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [storeLogout, navigate]);

  // Check authentication on mount - only after hydration and only once
  useEffect(() => {
    if (!hasHydrated) return; // Wait for Zustand to rehydrate from localStorage
    if (hasInitialized) return; // Only run once

    const initAuth = async () => {
      setHasInitialized(true);
      try {
        // For cookie-based auth, just check if we can get current user.
        // Race against a 10-second safety timeout so a slow/unreachable backend
        // never leaves the app stuck on the loading spinner indefinitely.
        await Promise.race([
          checkAuth(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Auth check timed out')), 10000)
          ),
        ]);
      } catch (error) {
        // Silently handle - user is not authenticated or backend is unavailable
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
        // Skip refresh when offline - store handles this gracefully
        if (!navigator.onLine) {
          console.debug('Offline: skipping scheduled token refresh');
          return;
        }
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
    isOfflineSession,
    error,
    login,
    logout,
    register,
    updateProfile,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const AUTH_FALLBACK: AuthContextType = {
  user: null,
  userRole: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  isOfflineSession: false,
  error: null,
  login: async () => ({ success: false, error: 'Not ready' }),
  logout: () => {},
  register: async () => ({ success: false, error: 'Not ready' }),
  updateProfile: async () => ({ success: false, error: 'Not ready' }),
  clearError: () => {},
};

export function useAuth() {
  const context = useContext(AuthContext);
  // During Vite HMR a module reload can briefly detach the context reference.
  // Return safe defaults rather than crashing the whole component tree.
  if (context === undefined) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('useAuth: context undefined — returning fallback (likely HMR transition)');
    }
    return AUTH_FALLBACK;
  }
  return context;
}

export default AuthContext;
