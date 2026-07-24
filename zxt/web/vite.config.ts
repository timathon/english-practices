import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for zxt.vibequizzing.com SPA deployment
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
});
