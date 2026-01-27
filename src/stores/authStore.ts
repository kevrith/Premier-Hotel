import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
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
  token: string | null;
  refreshToken: string | null;
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
  logout: () => void;
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
      token: null,
      refreshToken: null,
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

          // Debug: Log the full response to see what backend returns
          console.log('[AuthStore] Login response:', {
            hasUser: !!response.user,
            responseKeys: Object.keys(response)
          });

          const { user } = response;

          // For cookie-based auth, we don't store tokens in localStorage
          // The backend sets httpOnly cookies automatically

          // Check if user needs verification
          const needsEmailVerification = user.email && !user.email_verified;
          const needsPhoneVerification = user.phone && !user.phone_verified;

          set({
            user,
            token: null, // No token stored for cookie-based auth
            refreshToken: null,
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

          // For cookie-based auth, we don't store tokens in localStorage
          // The backend sets httpOnly cookies automatically

          set({
            user,
            token: null, // No token stored for cookie-based auth
            refreshToken: null,
            role: user.role,
            isAuthenticated: true,
            isLoading: false,
            needsVerification: true,
            verificationType: userData.email ? 'email' : 'phone',
          });

          return { success: true, user, needsVerification: true };
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Registration failed';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Verify OTP
      verifyOTP: async (otp, type) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = get();
          if (!user) throw new Error('No user found');

          let response;
          if (type === 'phone') {
            response = await authApi.verifyPhoneOTP({
              phone: user.phone,
              otp_code: otp,
            });
          } else {
            response = await authApi.verifyEmailOTP({
              email: user.email,
              token: otp,
            });
          }

          // Update user verification status
          set({
            user: {
              ...user,
              email_verified: type === 'email' ? true : user.email_verified,
              phone_verified: type === 'phone' ? true : user.phone_verified,
            },
            needsVerification: false,
            verificationType: null,
            isLoading: false,
          });

          return { success: true, message: response.message };
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
          const { user, verificationType } = get();
          if (!user) throw new Error('No user found');

          const data = verificationType === 'email'
            ? { email: user.email }
            : { phone: user.phone };

          await authApi.resendVerification(data);

          set({ isLoading: false });
          return { success: true, message: 'OTP sent successfully' };
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Failed to resend OTP';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Social Login (Google, Facebook, etc.)
      socialLogin: async (provider, accessToken) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.socialAuth({
            provider: provider as any,
            access_token: accessToken,
          });

          const { user } = response;

          // For cookie-based auth, we don't store tokens in localStorage
          // The backend sets httpOnly cookies automatically

          set({
            user,
            token: null, // No token stored for cookie-based auth
            refreshToken: null,
            role: user.role,
            isAuthenticated: true,
            isLoading: false,
            needsVerification: false,
            verificationType: null,
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
          const response = await authApi.forgotPassword({ email });
          set({ isLoading: false });
          return { success: true, message: response.message };
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Failed to send reset email';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Reset Password
      resetPassword: async (email, token, newPassword) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.resetPassword({
            email,
            token,
            new_password: newPassword,
          });
          set({ isLoading: false });
          return { success: true, message: response.message };
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Password reset failed';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Logout
      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            token: null,
            refreshToken: null,
            role: null,
            isAuthenticated: false,
            error: null,
            needsVerification: false,
            verificationType: null,
          });
        }
      },

      // Update Profile
      updateProfile: async (data) => {
        const { user } = get();
        if (!user) return;

        set({
          user: { ...user, ...data },
          isLoading: false,
        });
      },

      // Check if user is authenticated (for cookie-based auth)
      checkAuth: async () => {
        try {
          // Try to get current user to check if cookies are valid
          const response = await authApi.getCurrentUser();
          const { user } = response;

          set({
            user,
            isAuthenticated: true,
            token: null, // No token for cookie-based auth
            refreshToken: null,
            role: user.role,
          });

          return true;
        } catch (error) {
          // If we can't get user, clear auth state
          set({
            user: null,
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            role: null,
          });
          return false;
        }
      },

      // Refresh Access Token (for cookie-based auth, this is handled by backend)
      refreshAccessToken: async () => {
        // For cookie-based auth, refresh is handled automatically by the backend
        // Just try to get current user to ensure cookies are still valid
        try {
          const response = await authApi.getCurrentUser();
          const { user } = response;

          set({
            user,
            isAuthenticated: true,
            token: null, // No token for cookie-based auth
            refreshToken: null,
            role: user.role,
          });

          return true;
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            role: null,
          });
          return false;
        }
      },

      // Utility actions
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      setUser: (user) => set({ user }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export default useAuthStore;
