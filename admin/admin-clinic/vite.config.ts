import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.BACKEND_URL || 'http://139.59.109.214:8081'
  const isDocker = env.DOCKER === 'true'

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
      // Asset URLs must match browser origin when using Docker port map (3001 -> 3000)
      ...(isDocker ? {
        origin: 'http://localhost:3001',
        hmr: {
          protocol: 'ws',
          host: 'localhost',
          clientPort: 3001,
        },
      } : {}),
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/images': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  }
})

