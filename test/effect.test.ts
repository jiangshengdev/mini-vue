import { describe, expect, it } from 'vitest'
import { effect, reactive } from '../src'

describe('effect', () => {
  it('注册后会立刻执行一次副作用', () => {
    const state = reactive({ count: 0 })
    let observed = -1

    effect(() => {
      observed = state.count
    })

    expect(observed).toBe(0)

    state.count = 1
    expect(observed).toBe(1)
  })

  it('返回的 runner 可手动重新触发', () => {
    const state = reactive({ count: 0 })
    let dummy = -1

    const runner = effect(() => {
      dummy = state.count
      return dummy
    })

    expect(dummy).toBe(0)

    state.count = 2
    expect(dummy).toBe(2)

    const result = runner()
    expect(result).toBe(2)
    expect(dummy).toBe(2)
  })

  it('重复赋值相同内容不会再次执行 effect', () => {
    const state = reactive({ count: 0 })
    let runCount = 0

    effect(() => {
      runCount += 1
      void state.count
    })

    expect(runCount).toBe(1)

    state.count = 0
    expect(runCount).toBe(1)

    state.count = 1
    expect(runCount).toBe(2)
  })

  it('依赖切换后旧字段不会再触发 effect', () => {
    const state = reactive({ toggle: true, first: 1, second: 2 })
    let captured = 0
    let runCount = 0

    effect(() => {
      runCount += 1
      captured = state.toggle ? state.first : state.second
    })

    expect(captured).toBe(1)
    expect(runCount).toBe(1)

    state.second = 5
    expect(captured).toBe(1)
    expect(runCount).toBe(1)

    state.toggle = false
    expect(captured).toBe(5)
    expect(runCount).toBe(2)

    state.first = 10
    expect(captured).toBe(5)
    expect(runCount).toBe(2)

    state.second = 20
    expect(captured).toBe(20)
    expect(runCount).toBe(3)
  })

  it('嵌套 effect 只响应各自依赖', () => {
    const state = reactive({ outer: 0, inner: 0 })
    let outerRuns = 0
    let innerRuns = 0

    effect(() => {
      outerRuns += 1
      void state.outer

      effect(() => {
        innerRuns += 1
        void state.inner
      })
    })

    expect(outerRuns).toBe(1)
    expect(innerRuns).toBe(1)

    state.inner = 1
    expect(outerRuns).toBe(1)
    expect(innerRuns).toBe(2)

    state.outer = 1
    expect(outerRuns).toBe(2)
    expect(innerRuns).toBe(3)

    state.inner = 2
    expect(outerRuns).toBe(2)
    expect(innerRuns).toBe(4)
  })
})
