import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          // This will call the API service when backend is ready
          // For now, mock implementation
          const mockResponse = {
            access_token: 'mock-jwt-token',
            refresh_token: 'mock-refresh-token',
            user: {
              id: '1',
              email,
              role: email.includes('admin') ? 'admin' : 'customer',
              firstName: 'John',
              lastName: 'Doe'
            }
          };

          const { user, role } = mockResponse.user;

          set({
            user: mockResponse.user,
            token: mockResponse.access_token,
            refreshToken: mockResponse.refresh_token,
            role: mockResponse.user.role,
            isAuthenticated: true,
            isLoading: false
          });

          return { success: true };
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          // Mock implementation - replace with actual API call
          const mockResponse = {
            access_token: 'mock-jwt-token',
            refresh_token: 'mock-refresh-token',
            user: {
              id: Date.now().toString(),
              email: userData.email,
              role: 'customer',
              firstName: userData.firstName,
              lastName: userData.lastName,
              phone: userData.phone
            }
          };

          set({
            user: mockResponse.user,
            token: mockResponse.access_token,
            refreshToken: mockResponse.refresh_token,
            role: mockResponse.user.role,
            isAuthenticated: true,
            isLoading: false
          });

          return { success: true };
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          role: null,
          isAuthenticated: false,
          error: null
        });
      },

      updateProfile: async (data) => {
        const { user } = get();
        set({
          user: { ...user, ...data },
          isLoading: false
        });
      },

      checkAuth: () => {
        const { token } = get();
        if (token) {
          try {
            const decoded = jwtDecode(token);
            const isExpired = decoded.exp * 1000 < Date.now();

            if (isExpired) {
              get().logout();
              return false;
            }
            return true;
          } catch (error) {
            get().logout();
            return false;
          }
        }
        return false;
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          get().logout();
          return false;
        }

        try {
          // Mock implementation - replace with actual API call
          const mockResponse = {
            access_token: 'new-mock-jwt-token'
          };

          set({ token: mockResponse.access_token });
          return true;
        } catch (error) {
          get().logout();
          return false;
        }
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        role: state.role,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;
