import { describe, expect, it } from 'vitest'
import type { EffectHandle } from '@/index.ts'
import { effect, reactive } from '@/index.ts'

describe('effect 级联停止与 active 状态', () => {
  it('停止父 effect 会级联停止其内部创建的子 effect', () => {
    const state = reactive({ outer: 0, inner: 0 })

    let innerRuns = 0
    let innerHandle: EffectHandle | undefined

    const outerHandle = effect(function outerEffect() {
      void state.outer

      innerHandle = effect(function innerEffect() {
        innerRuns += 1
        void state.inner
      })
    })

    expect(innerRuns).toBe(1)

    state.inner += 1
    expect(innerRuns).toBe(2)

    outerHandle.stop()

    state.inner += 1
    expect(innerRuns).toBe(2)

    expect(innerHandle?.active).toBe(false)
  })

  it('active 能反映 stop 前后状态', () => {
    const state = reactive({ count: 0 })

    const handle = effect(function trackCount() {
      void state.count
    })

    expect(handle.active).toBe(true)

    handle.stop()

    expect(handle.active).toBe(false)
  })
})
