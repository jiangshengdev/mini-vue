import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeErrorHandler } from '@/index.ts'
import { effect, reactive, setRuntimeErrorHandler } from '@/index.ts'
import { runtimeErrorContexts } from '@/shared/index.ts'

describe('effect 调度行为', () => {
  afterEach(() => {
    setRuntimeErrorHandler(undefined)
  })

  it('支持 scheduler 自定义调度时延迟执行', () => {
    const state = reactive({ count: 0 })
    let runCount = 0
    const jobs: Array<() => void> = []

    effect(
      function schedTrack() {
        runCount += 1
        void state.count
      },
      {
        scheduler: function queueJob(job) {
          jobs.push(job)
        },
      },
    )

    expect(runCount).toBe(1)
    expect(jobs.length).toBe(0)

    state.count = 1
    expect(runCount).toBe(1)
    expect(jobs.length).toBe(1)

    jobs.shift()?.()
    expect(runCount).toBe(2)
    expect(jobs.length).toBe(0)

    state.count = 2
    expect(runCount).toBe(2)
    expect(jobs.length).toBe(1)
  })

  it('scheduler 在 stop 后仍会执行已排队的任务', () => {
    const state = reactive({ count: 0 })
    let runCount = 0
    const jobs: Array<() => void> = []

    const handle = effect(
      function schedTrackStop() {
        runCount += 1
        void state.count
      },
      {
        scheduler: function queueJob(job) {
          jobs.push(job)
        },
      },
    )

    expect(runCount).toBe(1)

    state.count = 1
    expect(runCount).toBe(1)
    expect(jobs.length).toBe(1)

    const job = jobs.shift()

    handle.stop()

    job?.()
    expect(runCount).toBe(2)
    expect(jobs.length).toBe(0)

    state.count = 2
    expect(runCount).toBe(2)
    expect(jobs.length).toBe(0)
  })

  it('scheduler 在 stop 后执行的任务不会重新收集依赖', () => {
    const state = reactive({ count: 0 })
    let runCount = 0
    const jobs: Array<() => void> = []

    const handle = effect(
      function schedTrackNoResub() {
        runCount += 1
        void state.count
      },
      {
        scheduler: function queueJob(job) {
          jobs.push(job)
        },
      },
    )

    expect(runCount).toBe(1)

    state.count = 1
    const job = jobs.shift()

    handle.stop()

    job?.()
    expect(runCount).toBe(2)

    state.count = 2
    expect(runCount).toBe(2)
    expect(jobs.length).toBe(0)

    state.count = 3
    expect(runCount).toBe(2)
    expect(jobs.length).toBe(0)
  })

  it('scheduler 抛错时不会阻断其余 effect 并触发统一错误处理', () => {
    const state = reactive({ count: 0 })
    const handler = vi.fn<RuntimeErrorHandler>()

    setRuntimeErrorHandler(handler)

    effect(
      function failSchedEffect() {
        void state.count
      },
      {
        scheduler: function throwSched() {
          throw new Error('scheduler failed')
        },
      },
    )

    let fallbackRuns = 0

    effect(function fallbackEffect() {
      fallbackRuns += 1
      void state.count
    })

    expect(fallbackRuns).toBe(1)

    state.count = 1

    expect(fallbackRuns).toBe(2)
    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect((error as Error).message).toBe('scheduler failed')
    expect(context).toBe(runtimeErrorContexts.scheduler)
  })

  it('调度队列按触发顺序执行，每次 flush 读取当前值', () => {
    const state = reactive({ count: 0 })
    const jobs: Array<() => void> = []
    const steps: number[] = []

    effect(
      function recordSteps() {
        steps.push(state.count)
      },
      {
        scheduler: function queueJob(job) {
          jobs.push(job)
        },
      },
    )

    expect(steps).toEqual([0])

    state.count = 1

    expect(steps).toEqual([0])
    expect(jobs.length).toBe(1)

    jobs.shift()?.()

    expect(steps).toEqual([0, 1])

    state.count = 2

    expect(jobs.length).toBe(1)

    jobs.shift()?.()

    expect(steps).toEqual([0, 1, 2])
  })
})
