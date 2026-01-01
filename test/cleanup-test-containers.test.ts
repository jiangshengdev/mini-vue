import { describe, expect, it } from 'vitest'
import { cleanupTestContainers, createTestContainer } from '$/index.ts'

describe('cleanupTestContainers', () => {
  it('只清理已登记容器，不应清空整个 document.body', () => {
    const fixture = document.createElement('div')

    fixture.dataset.testid = 'persistent-fixture'
    document.body.append(fixture)

    const container = createTestContainer()

    container.dataset.testid = 'test-container'

    cleanupTestContainers()

    expect(document.body.contains(container)).toBe(false)
    expect(document.body.querySelector('[data-testid="persistent-fixture"]')).toBe(fixture)

    fixture.remove()
  })
})
