import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function buildVersion(): string {
  // Format as vYYMMDD-HHMM in Asia/Shanghai (UTC+8)
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = pad(now.getUTCMonth() + 1);
  const dd = pad(now.getUTCDate());
  const hh = pad(now.getUTCHours());
  const mn = pad(now.getUTCMinutes());
  return `v${yy}${mm}${dd}-${hh}${mn}`;
}

// Vite configuration for zxt.vibequizzing.com SPA deployment
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion()),
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
});
