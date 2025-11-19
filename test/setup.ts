import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

const mountedContainers = new Set<HTMLElement>()

export function createTestContainer(): HTMLDivElement {
  const element = document.createElement('div')

  document.body.append(element)
  mountedContainers.add(element)

  return element
}

afterEach(() => {
  mountedContainers.forEach((element) => element.remove())
  mountedContainers.clear()
  document.body.innerHTML = ''
})
