import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward /api/* and /odata/* to the Express server.
      // This means the preview iframe (served on port 5173) can call
      // /odata/v4/customer/$metadata and the request will reach the
      // CAP service running on port 4004 via server.js's proxy.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/odata': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
