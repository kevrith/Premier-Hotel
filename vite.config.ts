import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest lets us use our own sw.ts with full Workbox control
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // Suppress the "use generateSW" warning since we intentionally use injectManifest
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'Premier Hotel Management',
        short_name: 'Premier Hotel',
        description: 'Luxury hotel management — works fully offline',
        theme_color: '#1E40AF',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      // injectManifest: config for the __WB_MANIFEST injection (not generateSW)
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB — covers large vendor chunks
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui':     ['@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-select', '@radix-ui/react-tooltip', '@radix-ui/react-checkbox', '@radix-ui/react-dropdown-menu'],
          'vendor-charts': ['recharts'],
          'vendor-query':  ['@tanstack/react-query', 'axios', 'zustand'],
          'vendor-utils':  ['date-fns', 'lucide-react', 'dexie'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
