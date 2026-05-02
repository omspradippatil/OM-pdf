import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
