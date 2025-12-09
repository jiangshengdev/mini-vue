import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { mergeConfig } from 'vite'
import vitestConfig from './vitest.config'

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        // https://vitest.dev/config/browser/playwright
        instances: [{ browser: 'chromium' }],
      },
    },
  }),
)
