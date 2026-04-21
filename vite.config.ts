import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Skip type checking during build
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
  build: {
    // Don't fail on TypeScript errors
    minify: true,
    sourcemap: true,
    // Cache busting: replace BUILD_TIMESTAMP_PLACEHOLDER in service-worker.js
    rollupOptions: {
      output: {
        // Add build timestamp to service worker cache name
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
