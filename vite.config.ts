import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-pdf': ['pdfjs-dist', 'jspdf'],
          'vendor-docs': ['mammoth', 'xlsx'],
          'vendor-utils': ['html2canvas', 'jszip', 'qrcode', 'date-fns', 'dexie'],
        },
      },
    },
  },
});
