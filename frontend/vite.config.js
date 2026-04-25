import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://backend:5000',
      '/ws': {
        target: 'ws://backend:5000',
        ws: true,
      },
    },
  },
});
