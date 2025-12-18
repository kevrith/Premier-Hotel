import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUIStore = create(
  persist(
    (set, get) => ({
      // State
      sidebarOpen: true,
      theme: 'light', // 'light', 'dark', or 'auto'
      language: 'en', // 'en' or 'sw'
      cartTrayExpanded: false,
      mobileMenuOpen: false,

      // Actions
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
      },

      setTheme: (theme) => {
        set({ theme });

        // Apply theme to document
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;

          if (theme === 'dark') {
            root.classList.add('dark');
          } else if (theme === 'light') {
            root.classList.remove('dark');
          } else {
            // Auto theme based on system preference
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (isDark) {
              root.classList.add('dark');
            } else {
              root.classList.remove('dark');
            }
          }
        }
      },

      setLanguage: (language) => {
        set({ language });
      },

      toggleCartTray: () => {
        set((state) => ({ cartTrayExpanded: !state.cartTrayExpanded }));
      },

      setCartTrayExpanded: (expanded) => {
        set({ cartTrayExpanded: expanded });
      },

      toggleMobileMenu: () => {
        set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen }));
      },

      setMobileMenuOpen: (open) => {
        set({ mobileMenuOpen: open });
      }
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        sidebarOpen: state.sidebarOpen
      })
    }
  )
);

// Initialize theme on load
if (typeof window !== 'undefined') {
  const storedTheme = useUIStore.getState().theme;
  useUIStore.getState().setTheme(storedTheme);
}

export default useUIStore;
