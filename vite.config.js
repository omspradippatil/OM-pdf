import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'OM PDF',
        short_name: 'OM PDF',
        description: 'Simple. Fast. Free PDF Tools',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          pdflib:  ['pdf-lib'],
          pdfjs:   ['pdfjs-dist'],
          firebase:['firebase/app','firebase/auth','firebase/storage','firebase/firestore'],
          react:   ['react','react-dom','react-router-dom'],
        },
      },
    },
  },
});
