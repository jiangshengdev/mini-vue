import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { mergeConfig } from 'vite'
import vitestConfig from './vitest.config'

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      env: {
        // 仅 Vitest 浏览器 runner 注入，值为字符串 'true' 触发内部调试路径。
        INTERNAL_DEV: 'true',
      },
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
