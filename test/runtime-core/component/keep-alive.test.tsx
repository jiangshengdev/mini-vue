import { describe, expect, it } from 'vitest'
import { createHostRenderer } from '../host-utils.ts'
import type { SetupComponent } from '@/index.ts'
import { KeepAlive, nextTick, onActivated, onDeactivated, onUnmounted, ref } from '@/index.ts'
import { createRenderer } from '@/runtime-core/index.ts'

describe('runtime-core KeepAlive', () => {
  it('缓存组件时 deactivate/activate 只移动节点不触发 remove，并复用宿主节点', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const show = ref(true)

    const Child: SetupComponent = () => {
      return () => {
        return <div class="child">child</div>
      }
    }

    const App: SetupComponent = () => {
      return () => {
        return <KeepAlive>{show.value ? <Child /> : undefined}</KeepAlive>
      }
    }

    renderer.render(<App />, host.container)
    await nextTick()

    console.log(
      'container children kinds',
      host.container.children.map((child) => child.kind),
    )

    const firstChild = host.container.children[0]

    host.resetCounts()
    show.value = false
    await nextTick()

    expect(host.container.children).toHaveLength(0)
    expect(host.counters.remove).toBe(0)

    host.resetCounts()
    show.value = true
    await nextTick()

    expect(host.container.children[0]).toBe(firstChild)
    expect(host.counters.remove).toBe(0)
  })

  it('onActivated/onDeactivated 在 KeepAlive 激活/失活时按子先父后顺序触发', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const show = ref(true)
    const calls: string[] = []

    const Child: SetupComponent = () => {
      onActivated(() => {
        calls.push('child activated')
      })
      onDeactivated(() => {
        calls.push('child deactivated')
      })

      return () => {
        return <div class="child">child</div>
      }
    }

    const Parent: SetupComponent = () => {
      onActivated(() => {
        calls.push('parent activated')
      })
      onDeactivated(() => {
        calls.push('parent deactivated')
      })

      return () => {
        return <Child />
      }
    }

    const App: SetupComponent = () => {
      return () => {
        return <KeepAlive>{show.value ? <Parent /> : undefined}</KeepAlive>
      }
    }

    renderer.render(<App />, host.container)
    await nextTick()

    expect(calls).toEqual(['child activated', 'parent activated'])

    calls.length = 0
    show.value = false
    await nextTick()

    expect(calls).toEqual(['child deactivated', 'parent deactivated'])

    calls.length = 0
    show.value = true
    await nextTick()

    expect(calls).toEqual(['child activated', 'parent activated'])
  })

  it('max 触发 LRU 淘汰时会完全卸载最旧实例', async () => {
    const host = createHostRenderer()
    const renderer = createRenderer(host.options)
    const current = ref<'A' | 'B'>('A')
    const calls: string[] = []

    const Demo: SetupComponent<{ label: 'A' | 'B' }> = (props) => {
      onUnmounted(() => {
        calls.push(`${props.label} unmounted`)
      })

      return () => {
        return <div class={props.label}>{props.label}</div>
      }
    }

    const App: SetupComponent = () => {
      return () => {
        return (
          <KeepAlive max={1}>
            <Demo key={current.value} label={current.value} />
          </KeepAlive>
        )
      }
    }

    renderer.render(<App />, host.container)
    await nextTick()

    current.value = 'B'
    await nextTick()

    expect(calls).toEqual(['A unmounted'])
  })
})
