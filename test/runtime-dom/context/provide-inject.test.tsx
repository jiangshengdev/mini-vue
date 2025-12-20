import { describe, expect, it } from 'vitest'
import { createHostWithApp, createRenderlessComponent, createTestContainer } from '$/index.ts'
import type { InjectionToken, SetupComponent } from '@/index.ts'
import { inject, provide, ref, render } from '@/index.ts'

describe('runtime-dom provide/inject', () => {
  it('在 setup 阶段从祖先 provide 注入值', () => {
    const injectedText = ref('')

    const Child = createRenderlessComponent(() => {
      const value = inject<string>('k')

      injectedText.value = value ?? ''
    })

    const Parent: SetupComponent = () => {
      provide('k', 'v')

      return () => {
        return <Child />
      }
    }

    const Root: SetupComponent = () => {
      return () => {
        return <Parent />
      }
    }

    const { app, container } = createHostWithApp(Root)

    app.mount(container)

    expect(injectedText.value).toBe('v')

    app.unmount()
  })

  it('注入 app.provide 提供的值', () => {
    const injectedText = ref('')

    const Child = createRenderlessComponent(() => {
      injectedText.value = inject<string>('k') ?? ''
    })

    const Root: SetupComponent = () => {
      return () => {
        return <Child />
      }
    }

    const { app, container } = createHostWithApp(Root)

    app.provide('k', 'v')
    app.mount(container)

    expect(injectedText.value).toBe('v')

    app.unmount()
  })

  it('key 缺失时返回 defaultValue', () => {
    const injectedText = ref('')

    const Child = createRenderlessComponent(() => {
      injectedText.value = inject('missing', 'fallback')
    })

    const Root: SetupComponent = () => {
      return () => {
        return <Child />
      }
    }

    const { app, container } = createHostWithApp(Root)

    app.mount(container)

    expect(injectedText.value).toBe('fallback')

    app.unmount()
  })

  it('直接渲染根 virtualNode 时从 virtualNode.appContext 注入值', () => {
    const injectedText = ref('')

    /* 直接操作 virtualNode.appContext 模拟外部渲染场景，验证渲染入口也能透传 provide。 */
    const Child = createRenderlessComponent(() => {
      injectedText.value = inject<string>('k') ?? ''
    })

    const container = createTestContainer()
    const virtualNode = <Child />

    ;(virtualNode as { appContext?: { provides: Record<InjectionToken, unknown> } }).appContext = {
      provides: {
        k: 'v',
      },
    }

    render(virtualNode, container)

    expect(injectedText.value).toBe('v')

    render(undefined, container)
  })
})
