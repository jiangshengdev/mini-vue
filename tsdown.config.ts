import { defineConfig } from 'tsdown'

export default defineConfig({
  exports: true,
  entry: {
    index: 'src/index.ts',
    ['jsx-dev-runtime']: 'src/jsx-dev-runtime.ts',
    ['jsx-runtime']: 'src/jsx-runtime.ts',
  },
})
