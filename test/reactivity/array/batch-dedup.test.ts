import { describe, expect, it } from 'vitest'
import { effect, reactive } from '@/index.ts'

describe('reactivity - array batch/dedup', () => {
  it('同步执行模式下，一次 push 只会触发一次重跑', () => {
    const list = reactive<number[]>([])
    let runs = 0

    effect(() => {
      runs += 1
      void list.length
      void list[0]
    })

    expect(runs).toBe(1)

    list.push(1)

    // 同步执行下，第一次触发会让 effect.run() 清理依赖，
    // 从而避免同一次 trigger 内对多个依赖桶重复执行。
    expect(runs).toBe(2)
  })

  it('自定义 scheduler 下，同一次 push 只应入队一次 job', () => {
    const list = reactive<number[]>([])
    const jobs: Array<() => void> = []

    effect(
      () => {
        void list.length
        void list[0]
      },
      {
        scheduler(job) {
          jobs.push(job)
        },
      },
    )

    expect(jobs.length).toBe(0)

    list.push(1)

    // 期望：同一轮变更只入队一个 job
    expect(jobs.length).toBe(1)
  })
})
