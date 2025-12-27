/**
 * LIS 可视化编排层集成测试
 *
 * 覆盖输入变化、导航/播放联动和 hover 刷新等主路径。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as HoverManagerModule from '../controllers/hover-manager.ts'
import type { HoverManagerDeps } from '../types.ts'
import { LongestIncreasingSubsequenceVisualization } from '../index.tsx'
import { createHostWithApp } from '$/index.ts'
import { nextTick } from '@/index.ts'

const hoverLogs = vi.hoisted(() => {
  return [] as number[][]
})

vi.mock('../controllers/hover-manager.ts', async (importOriginal) => {
  const actual: typeof HoverManagerModule = await importOriginal()

  return {
    ...actual,
    createHoverManager(deps: HoverManagerDeps) {
      const manager = actual.createHoverManager(deps)

      return {
        ...manager,
        handleChainHover(indexes: number[], chainIndex: number) {
          hoverLogs.push(indexes)
          manager.handleChainHover(indexes, chainIndex)
        },
      }
    },
  }
})

function mountApp() {
  const { app, container } = createHostWithApp(LongestIncreasingSubsequenceVisualization)

  app.mount(container)

  return { app, container }
}

describe('LongestIncreasingSubsequenceVisualization 编排层', () => {
  beforeEach(() => {
    hoverLogs.length = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('默认输入应渲染完整控制与数组视图', () => {
    const { app, container } = mountApp()

    expect(container.textContent).toContain('第 0 步 / 共 5 步')

    const arrayCells = container.querySelectorAll('[title^="点击跳转到第"]')

    expect(arrayCells.length).toBe(5)

    app.unmount()
  })

  it('清空输入应切换到空状态视图', async () => {
    const { app, container } = mountApp()

    const clearButton = container.querySelector('button[title="清空输入"]')!

    clearButton.dispatchEvent(new Event('click', { bubbles: true }))

    await nextTick()

    expect(container.textContent).toContain('请输入数组以开始可视化')
    expect(container.querySelector('[title^="点击跳转到第"]')).toBeNull()
    expect(container.querySelector('button[title="自动播放/暂停（Space）"]')).toBeNull()

    app.unmount()
  })

  it('输入变更后播放应基于新导航器推进并自动停止', async () => {
    vi.useFakeTimers()

    const { app, container } = mountApp()

    const input = container.querySelector<HTMLInputElement>('input[type="text"]')!

    input.value = '1 2'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await nextTick()

    expect(container.textContent).toContain('第 0 步 / 共 2 步')

    const playButton = container.querySelector('button[title="自动播放/暂停（Space）"]')!

    playButton.dispatchEvent(new Event('click', { bubbles: true }))

    vi.advanceTimersByTime(500)
    await nextTick()
    expect(container.textContent).toContain('第 1 步 / 共 2 步')

    vi.advanceTimersByTime(500)
    await nextTick()
    expect(container.textContent).toContain('第 2 步 / 共 2 步')

    vi.advanceTimersByTime(500)
    await nextTick()
    expect(playButton.textContent).toContain('自动')

    app.unmount()
  })

  it('链 hover 应刷新数组高亮状态', async () => {
    const { app, container } = mountApp()

    const nextButton = container.querySelector('button[title="下一步（→）"]')!

    nextButton.dispatchEvent(new Event('click', { bubbles: true }))

    await nextTick()

    expect(container.textContent).toContain('第 1 步 / 共 5 步')

    const chainIdxSpan = [...container.querySelectorAll('span')].find((span) => {
      return span.textContent === 'idx:0'
    })

    expect(chainIdxSpan).toBeDefined()

    const chain = chainIdxSpan!.parentElement!.parentElement!.parentElement!

    chain.dispatchEvent(new Event('mouseenter', { bubbles: true }))

    expect(hoverLogs.at(-1)).toEqual([0])

    chain.dispatchEvent(new Event('mouseleave', { bubbles: true }))

    app.unmount()
  })
})
