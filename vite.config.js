import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  // En développement, /api/* est redirigé vers le serveur chatbot
  // (`node server/index.mjs`, port 8787).
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
