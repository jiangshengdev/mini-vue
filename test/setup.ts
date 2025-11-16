import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

const mountedContainers = new Set<HTMLElement>()

export function createTestContainer(): HTMLDivElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  mountedContainers.add(el)

  return el
}

afterEach(() => {
  mountedContainers.forEach((el) => el.remove())
  mountedContainers.clear()
  document.body.innerHTML = ''
})
