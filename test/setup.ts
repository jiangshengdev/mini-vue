import * as jestDom from '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanupTestContainers } from '$/index.ts'

void jestDom

afterEach(() => {
  cleanupTestContainers()
})
