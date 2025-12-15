import { describe, expect, it } from 'vitest'
import { effect, reactive } from '@/index.ts'

describe('reactivity - array search', () => {
  it('reactive([raw]).includes/indexOf/lastIndexOf(raw) 应命中', () => {
    const raw = {}
    const list = reactive([raw])

    expect(list.includes(raw)).toBe(true)
    expect(list.indexOf(raw)).toBe(0)
    expect(list.lastIndexOf(raw)).toBe(0)
  })

  it('当入参为 proxy 时应回退到 raw 入参再查一次', () => {
    const raw = {}
    const proxy = reactive(raw)
    const list = reactive([raw])

    expect(list.includes(proxy)).toBe(true)
    expect(list.indexOf(proxy)).toBe(0)
    expect(list.lastIndexOf(proxy)).toBe(0)
  })

  it('effect 内使用 includes 会在索引 set 时重跑（依赖 iterate）', () => {
    const a = {}
    const b = {}
    const list = reactive([a])

    let runs = 0
    let observed = false

    effect(() => {
      runs += 1
      observed = list.includes(a)
    })

    expect(runs).toBe(1)
    expect(observed).toBe(true)

    list[0] = b

    expect(runs).toBe(2)
    expect(observed).toBe(false)
  })
})
