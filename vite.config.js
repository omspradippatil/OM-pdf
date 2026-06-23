import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      'pdfjs-dist': path.resolve(__dirname, 'node_modules/pdfjs-dist'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'OM PDF',
        short_name: 'OM PDF',
        description: 'Simple. Fast. Free PDF Tools',
        id: '/',
        start_url: '/',
        scope: '/',
        categories: ['productivity', 'utilities'],
        orientation: 'portrait-primary',
        display_override: ['standalone'],
        theme_color: '#0EA5E9',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '64x64',
            type: 'image/x-icon'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,xml,txt,wasm}'],
        navigateFallbackDenylist: [/^\/__\/auth/, /^\/sitemap(?:_final|-gsc)?\.xml/, /^\/robots\.txt/, /^\/google.*\.html/],
        maximumFileSizeToCacheInBytes: 10485760 // 10MB
      }
    })
  ],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      output: {
        manualChunks: {
          pdflib:  ['pdf-lib'],
          pdfjs:   ['pdfjs-dist'],
          firebase:['firebase/app','firebase/auth','firebase/storage','firebase/firestore'],
          react:   ['react','react-dom','react-router-dom'],
          mlc:     ['@mlc-ai/web-llm']
        },
      },
    },
  },
});
