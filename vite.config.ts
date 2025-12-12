import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
      '#': fileURLToPath(new URL('playground/src', import.meta.url)),
    },
  },
})
