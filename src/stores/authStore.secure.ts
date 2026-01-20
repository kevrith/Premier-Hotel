/**
 * Secure Authentication Store
 * SECURITY: Uses httpOnly cookies for token storage (XSS protection)
 * REPLACES: authStore.ts localStorage-based authentication
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as authApi from '@/lib/api/auth';

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

          // SECURITY: Tokens are stored in httpOnly cookies by the backend
          // No localStorage.setItem() calls - prevents XSS token theft

          // Check if user needs verification
          const needsEmailVerification = user.email && !user.email_verified;
          const needsPhoneVerification = user.phone && !user.phone_verified;

          set({
            user,
            role: user.role,
            isAuthenticated: true,
            isLoading: false,
            needsVerification: needsEmailVerification || needsPhoneVerification,
            verificationType: needsEmailVerification ? 'email' : needsPhoneVerification ? 'phone' : null,
          });

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

        // Clear local state
        set({
          user: null,
          role: null,
          isAuthenticated: false,
          error: null,
          needsVerification: false,
          verificationType: null,
        });

        // SECURITY: No localStorage.removeItem() needed - cookies cleared by backend
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
        try {
          // Try to get current user from httpOnly cookie
          const response = await authApi.getCurrentUser();

          if (response && response.user) {
            set({
              user: response.user,
              role: response.user.role,
              isAuthenticated: true,
              error: null,
            });
            return true;
          } else {
            set({
              user: null,
              role: null,
              isAuthenticated: false,
            });
            return false;
          }
        } catch (error) {
          // Cookie is invalid or expired
          set({
            user: null,
            role: null,
            isAuthenticated: false,
          });
          return false;
        }
      },

      // Refresh Access Token
      refreshAccessToken: async () => {
        try {
          // Call refresh endpoint (uses refresh token cookie)
          await authApi.refreshToken();

          // Check if still authenticated
          return await get().checkAuth();
        } catch (error) {
          // Refresh token is invalid or expired
          set({
            user: null,
            role: null,
            isAuthenticated: false,
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

          // SECURITY: Tokens in httpOnly cookies

          set({
            user,
            role: user.role,
            isAuthenticated: true,
            isLoading: false,
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
      // Only persist user data, not tokens (tokens in httpOnly cookies)
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
