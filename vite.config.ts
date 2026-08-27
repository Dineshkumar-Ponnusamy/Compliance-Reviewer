import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/pdfjs-dist')) return 'pdfjs';
          if (id.includes('node_modules/mammoth')) return 'mammoth';
          if (id.includes('node_modules/xlsx')) return 'xlsx';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react';
          if (
            id.includes('node_modules/react-markdown') ||
            id.includes('node_modules/react-diff-viewer') ||
            id.includes('node_modules/classnames')
          ) {
            return 'ui';
          }
          if (id.includes('node_modules/@google/generative-ai') || id.includes('node_modules/idb')) return 'ai';
        },
      },
    },
  },
});
