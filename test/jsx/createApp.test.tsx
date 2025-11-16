import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/dom'
import type { ComponentType } from '@/index.ts'
import { createApp } from '@/index.ts'
import { createTestContainer } from '../setup.ts'

const App: ComponentType = () => {
  return <div class="hello">Hello</div>
}

describe('createApp', () => {
  it('支持通过选择器挂载', () => {
    const host = createTestContainer()
    host.id = 'app'

    const app = createApp(App)
    app.mount('#app')

    expect(screen.getByText('Hello')).toBeVisible()
  })

  it('支持直接传入容器', () => {
    const host = document.createElement('div')
    const app = createApp(App)
    app.mount(host)
    const view = within(host)
    expect(view.getByText('Hello')).toHaveClass('hello')
    app.unmount()
    expect(host).toBeEmptyDOMElement()
  })

  it('重复挂载会抛异常', () => {
    const host = document.createElement('div')
    const app = createApp(App)
    app.mount(host)
    expect(() => app.mount(host)).toThrowError('当前应用已挂载')
    app.unmount()
  })
})
