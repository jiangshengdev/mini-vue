import { describe, expect, it } from 'vitest'
import { createApp } from '@/jsx/createApp.ts'

function App() {
  return <div class="hello">Hello</div>
}

describe('createApp', () => {
  it('支持通过选择器挂载', () => {
    const host = document.createElement('div')
    host.id = 'app'
    document.body.appendChild(host)

    const app = createApp(App)
    app.mount('#app')

    expect(host.innerHTML).toBe('<div class="hello">Hello</div>')

    host.remove()
  })

  it('支持直接传入容器', () => {
    const host = document.createElement('div')
    const app = createApp(App)
    app.mount(host)
    expect(host.innerHTML).toContain('Hello')
    app.unmount()
    expect(host.innerHTML).toBe('')
  })

  it('重复挂载会抛异常', () => {
    const host = document.createElement('div')
    const app = createApp(App)
    app.mount(host)
    expect(() => app.mount(host)).toThrowError('当前应用已挂载')
  })
})
