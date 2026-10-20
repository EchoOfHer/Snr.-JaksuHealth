import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward all /api/* requests to FastAPI backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Forward /predict (legacy direct call)
      '/predict': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Forward /export-pdf
      '/export-pdf': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
