/// <reference types="vite/client" />

declare module 'next-themes' {
  export function useTheme(): { theme?: string; setTheme: (theme: string) => void; resolvedTheme?: string };
  export const ThemeProvider: React.ComponentType<any>;
}

declare module 'sonner' {
  export const Toaster: React.ComponentType<any>;
  export function toast(message: string, options?: any): void;
  export namespace toast {
    function success(message: string, options?: any): void;
    function error(message: string, options?: any): void;
    function info(message: string, options?: any): void;
    function warning(message: string, options?: any): void;
    function loading(message: string, options?: any): void;
    function dismiss(id?: string): void;
  }
}

declare module 'virtual:pwa-register/react' {
  export function useRegisterSW(options?: any): {
    needRefresh: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
    offlineReady: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}