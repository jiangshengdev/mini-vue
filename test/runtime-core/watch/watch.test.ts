import { describe, expect, it } from 'vitest'
import { nextTick, reactive, watch } from '@/index.ts'
import { queueSchedulerJob } from '@/runtime-core/index.ts'

describe('runtime watch 调度接入', () => {
  it('默认 flush: pre 在渲染任务前异步执行', async () => {
    const calls: Array<string | number> = []
    const state = reactive({ count: 0 })

    watch(
      () => {
        return state.count
      },
      (value) => {
        calls.push(`watch:${value}`)
      },
    )

    queueSchedulerJob(() => {
      calls.push('render')
    })

    state.count = 1
    expect(calls).toEqual([])

    await nextTick()
    expect(calls).toEqual(['watch:1', 'render'])
  })

  it('flush: post 在渲染任务后执行', async () => {
    const calls: Array<string | number> = []
    const state = reactive({ count: 0 })

    watch(
      () => {
        return state.count
      },
      (value) => {
        calls.push(`post:${value}`)
      },
      { flush: 'post' },
    )

    queueSchedulerJob(() => {
      calls.push('render')
    })

    state.count = 1
    expect(calls).toEqual([])

    await nextTick()
    expect(calls).toEqual(['render', 'post:1'])
  })

  it('flush: sync 保持同步触发', () => {
    const calls: number[] = []
    const state = reactive({ count: 0 })

    watch(
      () => {
        return state.count
      },
      (value) => {
        calls.push(value)
      },
      { flush: 'sync' },
    )

    state.count = 1
    expect(calls).toEqual([1])
  })
})
