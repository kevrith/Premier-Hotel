// @ts-nocheck
/**
 * Secure Authentication Store
 * SECURITY: Uses httpOnly cookies for token storage (XSS protection)
 * REPLACES: authStore.ts localStorage-based authentication
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import * as authApi from '@/lib/api/auth';
import { cacheUser, cacheMenuItems } from '@/lib/db/localDatabase';
import { api } from '@/lib/api/client';

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Track if auth check is in progress to prevent concurrent calls
let authCheckInProgress = false;
let authCheckPromise: Promise<boolean> | null = null;

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

interface AuthState {
  // State
  user: User | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  needsVerification: boolean;
  verificationType: 'email' | 'phone' | null;
  hasHydrated: boolean;
  lastAuthenticatedAt: string | null;
  isOfflineSession: boolean;
  token: string | null;
  refreshToken: string | null;

  // Actions
  login: (identifier: string, password: string, type?: 'email' | 'phone') => Promise<any>;
  register: (userData: any) => Promise<any>;
  logout: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  checkAuth: () => Promise<boolean>;
  refreshAccessToken: () => Promise<boolean>;
  verifyOTP: (otp: string, type: 'email' | 'phone') => Promise<any>;
  resendOTP: () => Promise<any>;
  socialLogin: (provider: string, accessToken: string) => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<any>;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setUser: (user: User) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      needsVerification: false,
      verificationType: null,
      hasHydrated: false,
      lastAuthenticatedAt: null,
      isOfflineSession: false,
      token: null,
      refreshToken: null,

      // Login - Auto-detect email or phone
      login: async (identifier, password, type) => {
        set({ isLoading: true, error: null });
        try {
          let response;

          // Auto-detect type if not provided
          if (!type) {
            type = identifier.includes('@') ? 'email' : 'phone';
          }

          // Call appropriate API endpoint
          if (type === 'email') {
            response = await authApi.loginWithEmail({ email: identifier, password });
          } else {
            // Format phone if needed
            const phone = identifier.startsWith('+') ? identifier : `+${identifier}`;
            response = await authApi.loginWithPhone({ phone, password });
          }

          const { user } = response;

          const needsEmailVerification = !!(user.email && !user.email_verified);
          const needsPhoneVerification = !!(user.phone && !user.phone_verified);

          // Store tokens in Zustand state + localStorage for PWA persistence
          if (response.access_token) {
            set({
              user,
              role: user.role,
              isAuthenticated: true,
              isLoading: false,
              lastAuthenticatedAt: new Date().toISOString(),
              isOfflineSession: false,
              token: response.access_token,
              refreshToken: response.refresh_token || null,
              needsVerification: needsEmailVerification || needsPhoneVerification,
              verificationType: needsEmailVerification ? 'email' : needsPhoneVerification ? 'phone' : null,
            });
          } else {
            set({
              user,
              role: user.role,
              isAuthenticated: true,
              isLoading: false,
              lastAuthenticatedAt: new Date().toISOString(),
              isOfflineSession: false,
              needsVerification: needsEmailVerification || needsPhoneVerification,
              verificationType: needsEmailVerification ? 'email' : needsPhoneVerification ? 'phone' : null,
            });
          }

          // Cache user and menu items for offline use (non-fatal)
          try {
            await cacheUser({
              id: user.id,
              email: user.email || '',
              full_name: user.full_name || '',
              role: user.role,
              token: '', // httpOnly cookies — no JS-accessible token
            });

            // Cache menu in background
            api.get('/menu/items').then(res => {
              cacheMenuItems(res.data || []).catch(() => {});
            }).catch(() => {});
          } catch (e) {
            // Caching failure is non-fatal
          }

          return {
            success: true,
            user,
            needsVerification: needsEmailVerification || needsPhoneVerification
          };
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Login failed';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Register
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          let response;
          const fullName = `${userData.firstName} ${userData.lastName}`.trim();

          // Determine if registering with email or phone
          if (userData.email) {
            response = await authApi.registerWithEmail({
              email: userData.email,
              password: userData.password,
              full_name: fullName,
            });
          } else if (userData.phone) {
            const phone = userData.phone.startsWith('+') ? userData.phone : `+${userData.phone}`;
            response = await authApi.registerWithPhone({
              phone,
              password: userData.password,
              full_name: fullName,
            });
          } else {
            throw new Error('Email or phone is required');
          }

          const { user } = response;

          // SECURITY: Tokens are stored in httpOnly cookies by the backend
          // No localStorage.setItem() calls

          set({
            user,
            role: user.role,
            isAuthenticated: true,
            isLoading: false,
            needsVerification: !user.email_verified || !user.phone_verified,
            verificationType: !user.email_verified ? 'email' : !user.phone_verified ? 'phone' : null,
          });

          return {
            success: true,
            user,
            needsVerification: !user.email_verified || !user.phone_verified
          };
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Registration failed';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Logout
      logout: async () => {
        try {
          // Call backend logout to clear httpOnly cookies
          await authApi.logout();
        } catch (error) {
          // Continue with local logout even if API call fails
          console.error('Logout API call failed:', error);
        }

        // Clear local state including tokens
        set({
          user: null,
          role: null,
          isAuthenticated: false,
          error: null,
          needsVerification: false,
          verificationType: null,
          lastAuthenticatedAt: null,
          isOfflineSession: false,
          token: null,
          refreshToken: null,
        });
      },

      // Update Profile
      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.updateProfile(data);

          set({
            user: response.user,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Profile update failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Check Auth - Verify if user is authenticated
      checkAuth: async () => {
        // Prevent concurrent auth checks - return existing promise if in progress
        if (authCheckInProgress && authCheckPromise) {
          return authCheckPromise;
        }

        authCheckInProgress = true;
        authCheckPromise = (async () => {
          try {
            // If offline, trust cached state within a 24-hour window
            if (!navigator.onLine) {
              const { user, isAuthenticated, lastAuthenticatedAt } = get();
              if (user && isAuthenticated && lastAuthenticatedAt) {
                const hoursSinceAuth = (Date.now() - new Date(lastAuthenticatedAt).getTime()) / (1000 * 60 * 60);
                if (hoursSinceAuth < 168) { // 7 days
                  set({ isOfflineSession: true });
                  return true;
                }
              }
              return false;
            }

            // Get token from Zustand state OR directly from localStorage
            // (localStorage fallback handles the case where Zustand hasn't rehydrated yet)
            let bearerToken = get().token || '';
            if (!bearerToken) {
              try {
                const raw = localStorage.getItem('auth-storage');
                if (raw) {
                  const parsed = JSON.parse(raw);
                  bearerToken = parsed.state?.token || '';
                }
              } catch { /* ignore */ }
            }

            const response = await axios.get(`${API_BASE_URL}/auth/me`, {
              withCredentials: true,
              timeout: 8000,
              headers: {
                'Cache-Control': 'no-store',
                ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
              },
            });

            const user = response.data?.user || response.data;

            if (user && user.id) {
              set({
                user,
                role: user.role,
                isAuthenticated: true,
                error: null,
                lastAuthenticatedAt: new Date().toISOString(),
                isOfflineSession: false,
              });
              return true;
            } else {
              set({
                user: null,
                role: null,
                isAuthenticated: false,
                lastAuthenticatedAt: null,
                isOfflineSession: false,
              });
              return false;
            }
          } catch (error: any) {
            const networkErrorCodes = ['ERR_NETWORK', 'ERR_CONNECTION_REFUSED', 'ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT'];
            const isNetworkError = !error.response && (
              !navigator.onLine ||
              networkErrorCodes.includes(error.code) ||
              error.message === 'Network Error'
            );

            if (isNetworkError) {
              const { user, isAuthenticated, lastAuthenticatedAt } = get();
              if (user && isAuthenticated && lastAuthenticatedAt) {
                const hoursSinceAuth = (Date.now() - new Date(lastAuthenticatedAt).getTime()) / (1000 * 60 * 60);
                if (hoursSinceAuth < 168) {
                  set({ isOfflineSession: true });
                  return true;
                }
              }
              return false;
            }

            // Genuine auth error — protect recently-authenticated sessions from cold-start 401s.
            // This covers both token-based sessions and old cookie-only sessions (token: "").
            const { user: currentUser, isAuthenticated: currentlyAuth, lastAuthenticatedAt } = get();
            if (currentlyAuth && currentUser && lastAuthenticatedAt) {
              const hoursSinceAuth = (Date.now() - new Date(lastAuthenticatedAt).getTime()) / (1000 * 60 * 60);
              if (hoursSinceAuth < 168) {
                // Session is within 7 days — treat as temporarily unreachable, keep alive
                set({ isOfflineSession: true });
                return true;
              }
            }

            set({
              user: null,
              role: null,
              isAuthenticated: false,
              lastAuthenticatedAt: null,
              isOfflineSession: false,
              token: null,
              refreshToken: null,
            });
            return false;
          } finally {
            authCheckInProgress = false;
            authCheckPromise = null;
          }
        })();

        return authCheckPromise;
      },

      // Refresh Access Token
      refreshAccessToken: async () => {
        try {
          if (!navigator.onLine) {
            set({ isOfflineSession: true });
            return true;
          }

          const { refreshToken: storedRefreshToken } = get();

          const res = await axios.post(`${API_BASE_URL}/auth/refresh`,
            storedRefreshToken ? { refresh_token: storedRefreshToken } : {},
            { withCredentials: true, timeout: 8000 }
          );

          // Save new tokens if returned
          if (res.data?.access_token) {
            set({
              token: res.data.access_token,
              refreshToken: res.data.refresh_token || storedRefreshToken,
            });
          }

          return true;
        } catch (error: any) {
          // Don't logout on network errors (same set of codes as checkAuth)
          const networkErrorCodes = ['ERR_NETWORK', 'ERR_CONNECTION_REFUSED', 'ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT'];
          const isNetworkError = !error.response && (
            !navigator.onLine ||
            networkErrorCodes.includes(error.code) ||
            error.message === 'Network Error'
          );

          if (isNetworkError) {
            set({ isOfflineSession: true });
            return true;
          }

          // Genuine server rejection - session is truly invalid
          set({
            user: null,
            role: null,
            isAuthenticated: false,
            lastAuthenticatedAt: null,
            isOfflineSession: false,
          });
          return false;
        }
      },

      // Verify OTP
      verifyOTP: async (otp, type) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.verifyOTP(otp, type);

          // Update user verification status
          if (get().user) {
            const updatedUser = {
              ...get().user!,
              email_verified: type === 'email' ? true : get().user!.email_verified,
              phone_verified: type === 'phone' ? true : get().user!.phone_verified,
            };

            set({
              user: updatedUser,
              needsVerification: false,
              verificationType: null,
              isLoading: false,
            });
          }

          return { success: true };
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Verification failed';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Resend OTP
      resendOTP: async () => {
        set({ isLoading: true, error: null });
        try {
          const { user } = get();
          if (!user) throw new Error('No user logged in');

          const type = get().verificationType || 'email';
          await authApi.resendOTP(type);

          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Failed to resend OTP';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Social Login
      socialLogin: async (provider, accessToken) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.socialLogin(provider, accessToken);

          const { user } = response;

          set({
            user,
            role: user.role,
            isAuthenticated: true,
            isLoading: false,
            lastAuthenticatedAt: new Date().toISOString(),
            isOfflineSession: false,
            // Save tokens for mobile/cross-origin where cookies are blocked
            token: (response as any).access_token || null,
            refreshToken: (response as any).refresh_token || null,
          });

          return { success: true, user };
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Social login failed';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Forgot Password
      forgotPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.requestPasswordReset(email);

          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Password reset request failed';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Reset Password
      resetPassword: async (email, token, newPassword) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.confirmPasswordReset(token, newPassword);

          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Password reset failed';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Utility Actions
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      setUser: (user) => set({ user, role: user.role, isAuthenticated: true }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
        lastAuthenticatedAt: state.lastAuthenticatedAt,
        token: (state as any).token || '',
        refreshToken: (state as any).refreshToken || '',
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export default useAuthStore;
