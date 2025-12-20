import * as jestDom from '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

void jestDom

afterEach(async () => {
  /* 延迟加载容器清理，避免顶层引入 helpers 触发运行时代码加载。 */
  const { cleanupTestContainers } = await import('./helpers.ts')

  cleanupTestContainers()
})
