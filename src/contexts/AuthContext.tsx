import { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  permissions?: string[];
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

export function AuthProvider({ children }: { children: any }) {
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
    clearError,
  } = useAuthStore();

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const initDone = useRef(false);
  const prevAuthenticated = useRef<boolean | null>(null);

  useDataPreCache(user?.id, role);

  // Session-expired handler — fires for genuine 401s from the API interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      const state = useAuthStore.getState();
      if (state.isOfflineSession) return;
      if (window.location.pathname === '/login') return;
      storeLogout().then(() => navigate('/login', { replace: true }));
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [storeLogout, navigate]);

  // Safety net: if isAuthenticated drops to false after being true (token expired,
  // background refresh failed), force navigation to login so the user isn't stuck
  // on a page with a broken/dead session.
  useEffect(() => {
    if (isLoading) return;
    if (isOfflineSession) return;
    if (prevAuthenticated.current === true && !isAuthenticated) {
      if (window.location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    }
    prevAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, isOfflineSession, isLoading, navigate]);

  // One-time auth initialization after Zustand has rehydrated from localStorage
  useEffect(() => {
    if (!hasHydrated) return;
    if (initDone.current) return;
    initDone.current = true;

    const init = async () => {
      try {
        const state = useAuthStore.getState();

        // If we already have a valid authenticated session in persisted state,
        // trust it — no network call needed on startup.
        // We check lastAuthenticatedAt within 7 days; token may be empty for
        // sessions that pre-date the Bearer-token login flow.
        if (state.isAuthenticated && state.user && state.lastAuthenticatedAt) {
          const hoursSince = (Date.now() - new Date(state.lastAuthenticatedAt).getTime()) / (1000 * 60 * 60);
          if (hoursSince < 168) { // 7 days
            setIsLoading(false);
            // Background refresh to pick up permission/role changes without blocking the UI
            if (navigator.onLine) {
              checkAuth().catch(() => {});
            }
            return;
          }
        }

        // No persisted session — try a network auth check
        await Promise.race([
          checkAuth(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 10_000)
          ),
        ]);
      } catch {
        // Silently ignore — user simply isn't authenticated
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [hasHydrated, checkAuth]);

  // Periodic token refresh every 25 minutes (token expires in 30)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        await refreshAccessToken();
      } catch {
        // refreshAccessToken handles its own state cleanup
      }
    }, 25 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshAccessToken]);

  const login = async (email: string, password: string) => {
    try {
      return await storeLogin(email, password);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => storeLogout();

  const register = async (userData: any) => {
    try {
      return await storeRegister(userData);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const updateProfile = async (data: any) => {
    try {
      await storeUpdateProfile(data);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userRole: role,
      role,
      isAuthenticated,
      isLoading: isLoading || storeLoading,
      isOfflineSession,
      error,
      login,
      logout,
      register,
      updateProfile,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
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
  if (context === undefined) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('useAuth: context undefined — returning fallback');
    }
    return AUTH_FALLBACK;
  }
  return context;
}

export default AuthContext;
