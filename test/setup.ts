import * as jestDom from '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanupTestContainers } from './helpers.ts'

void jestDom

afterEach(() => {
  cleanupTestContainers()
})
