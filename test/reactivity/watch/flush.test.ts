import { describe, expect, it, vi } from 'vitest'
import { reactive, watch } from '@/index.ts'

async function nextMicrotask(): Promise<void> {
  return new Promise((resolve) => {
    queueMicrotask(resolve)
  })
}

describe('watch - flush 选项', () => {
  it('flush: sync 默认同步触发', () => {
    const state = reactive({ count: 0 })
    const spy = vi.fn()

    watch(
      () => {
        return state.count
      },
      (value) => {
        spy(value)
      },
    )

    expect(spy).toHaveBeenCalledTimes(0)

    state.count = 1
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith(1)
  })

  it('flush: pre 延迟到微任务，首跑仍同步', async () => {
    const state = reactive({ count: 0 })
    const spy = vi.fn()

    watch(
      () => {
        return state.count
      },
      (value) => {
        spy(value)
      },
      { flush: 'pre' },
    )

    expect(spy).toHaveBeenCalledTimes(0)

    state.count = 1
    expect(spy).toHaveBeenCalledTimes(0)

    await nextMicrotask()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith(1)
  })

  it('flush: pre + immediate 首次同步，后续延迟到微任务', async () => {
    const state = reactive({ count: 0 })
    const spy = vi.fn()

    watch(
      () => {
        return state.count
      },
      (value) => {
        spy(value)
      },
      { flush: 'pre', immediate: true },
    )

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith(0)

    state.count = 1
    expect(spy).toHaveBeenCalledTimes(1)

    await nextMicrotask()
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenLastCalledWith(1)
  })

  it('flush: pre 同一微任务多次触发仅执行一次，取最新值', async () => {
    const state = reactive({ count: 0 })
    const spy = vi.fn()

    watch(
      () => {
        return state.count
      },
      (value) => {
        spy(value)
      },
      { flush: 'pre' },
    )

    state.count = 1
    state.count = 2

    await nextMicrotask()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith(2)
  })

  it('flush: post 行为与 pre 相同，占位微任务', async () => {
    const state = reactive({ count: 0 })
    const spy = vi.fn()

    watch(
      () => {
        return state.count
      },
      (value) => {
        spy(value)
      },
      { flush: 'post' },
    )

    state.count = 1
    expect(spy).toHaveBeenCalledTimes(0)

    await nextMicrotask()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith(1)
  })
})
