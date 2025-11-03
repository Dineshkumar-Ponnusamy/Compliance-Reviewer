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
        manualChunks: {
          // Split large libraries into separate chunks for better caching
          pdfjs: ['pdfjs-dist'],
          mammoth: ['mammoth'],
          xlsx: ['xlsx'],
          react: ['react', 'react-dom'],
          ui: ['react-markdown', 'react-diff-viewer-continued', 'classnames'],
          ai: ['@google/generative-ai', 'idb'],
        },
      },
    },
  },
});
