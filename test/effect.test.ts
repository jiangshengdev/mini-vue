import { describe, expect, it } from 'vitest'
import { effect, reactive } from '../src'

describe('effect', () => {
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
})
