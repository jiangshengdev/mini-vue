import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { miniVueDevtoolsSetupStateNamesPlugin } from './src/vite-plugin/index.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    miniVueDevtoolsSetupStateNamesPlugin({
      importSource: '@/index.ts',
    }),
  ],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('src', import.meta.url)),
      },
      {
        find: '#',
        replacement: fileURLToPath(new URL('playground', import.meta.url)),
      },
      {
        find: '$',
        replacement: fileURLToPath(new URL('test', import.meta.url)),
      },
    ],
  },
})
