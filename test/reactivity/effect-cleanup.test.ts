import { afterEach, describe, expect, it, vi } from 'vitest'
import { effect, reactive, setMiniErrorHandler } from '@/index.ts'
import type { MiniErrorHandler } from '@/index.ts'

describe('effect cleanup error handling', () => {
  afterEach(() => {
    setMiniErrorHandler(undefined)
  })

  it('父 effect 停止时子 effect cleanup 抛错不会阻断后续清理', () => {
    const state = reactive({ count: 0 })
    const handler = vi.fn<MiniErrorHandler>()
    const cleanupOrder: number[] = []

    setMiniErrorHandler(handler)

    // 创建父 effect
    const parent = effect(() => {
      void state.count
      
      // 创建子 effect
      const child = effect(() => {
        void state.count
      })
      
      // 手动注册一个会抛错的 cleanup
      child.registerCleanup(() => {
        cleanupOrder.push(1)
        throw new Error('cleanup 1 failed')
      })
      
      // 注册另一个正常的 cleanup
      child.registerCleanup(() => {
        cleanupOrder.push(2)
      })
    })

    // 停止父 effect，应该触发子 effect 的清理
    parent.stop()

    // 两个 cleanup 都应该被执行
    expect(cleanupOrder).toEqual([1, 2])
    
    // 错误应该被统一处理器捕获
    expect(handler).toHaveBeenCalledTimes(1)
    const [error, context] = handler.mock.calls[0]

    expect((error as Error).message).toBe('cleanup 1 failed')
    expect(context).toBe('effect-cleanup')
  })
})
