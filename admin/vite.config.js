import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Production builds are served under /admin/ on nginx (see docs/ADMIN_DEPLOYMENT.md).
  base: mode === 'production' ? '/admin/' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://word-master.org',
        changeOrigin: true,
      },
    },
  },
}));
