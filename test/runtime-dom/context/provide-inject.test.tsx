import { describe, expect, it } from 'vitest'
import { createTestContainer } from '../../setup.ts'
import type { InjectionToken, SetupComponent } from '@/index.ts'
import { createApp, inject, provide, ref, render } from '@/index.ts'

function mountToFreshContainer(component: SetupComponent) {
  const container = createTestContainer()
  const app = createApp(component)

  app.mount(container)

  return { app, container }
}

describe('runtime-dom provide/inject', () => {
  it('在 setup 阶段从祖先 provide 注入值', () => {
    const injectedText = ref('')

    const Child: SetupComponent = () => {
      const value = inject<string>('k')

      injectedText.value = value ?? ''

      return () => {
        return undefined
      }
    }

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

    const { app } = mountToFreshContainer(Root)

    expect(injectedText.value).toBe('v')

    app.unmount()
  })

  it('注入 app.provide 提供的值', () => {
    const injectedText = ref('')

    const Child: SetupComponent = () => {
      injectedText.value = inject<string>('k') ?? ''

      return () => {
        return undefined
      }
    }

    const Root: SetupComponent = () => {
      return () => {
        return <Child />
      }
    }

    const container = createTestContainer()
    const app = createApp(Root)

    app.provide('k', 'v')
    app.mount(container)

    expect(injectedText.value).toBe('v')

    app.unmount()
  })

  it('key 缺失时返回 defaultValue', () => {
    const injectedText = ref('')

    const Child: SetupComponent = () => {
      injectedText.value = inject('missing', 'fallback')

      return () => {
        return undefined
      }
    }

    const Root: SetupComponent = () => {
      return () => {
        return <Child />
      }
    }

    const { app } = mountToFreshContainer(Root)

    expect(injectedText.value).toBe('fallback')

    app.unmount()
  })

  it('直接渲染根 vnode 时从 vnode.appContext 注入值', () => {
    const injectedText = ref('')

    const Child: SetupComponent = () => {
      injectedText.value = inject<string>('k') ?? ''

      return () => {
        return undefined
      }
    }

    const container = createTestContainer()
    const vnode = <Child />

    ;(vnode as { appContext?: { provides: Record<InjectionToken, unknown> } }).appContext = {
      provides: {
        k: 'v',
      },
    }

    render(vnode, container)

    expect(injectedText.value).toBe('v')

    render(undefined, container)
  })
})
