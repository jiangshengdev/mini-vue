import { describe, expect, it } from 'vitest'
import { createTestContainer } from '$/index.ts'
import type { SetupComponent } from '@/index.ts'
import { nextTick, reactive, render } from '@/index.ts'

describe('runtime-dom render: fragment 子节点锚点', () => {
  it('元素子树 patch 不应继承父级锚点', async () => {
    const container = createTestContainer()
    const state = reactive({
      show: false,
    })

    const App: SetupComponent = () => {
      return () => {
        return (
          <>
            <div id="wrapper">{state.show ? <p>child</p> : null}</div>
            <span>tail</span>
          </>
        )
      }
    }

    render(<App />, container)

    const wrapper = container.querySelector('#wrapper')!

    expect(wrapper.textContent).toBe('')

    expect(() => {
      state.show = true
    }).not.toThrow()

    await nextTick()

    expect(wrapper.textContent).toBe('child')
    expect(container.textContent).toBe('childtail')
  })
})
