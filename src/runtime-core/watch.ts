/**
 * 运行时层的 watch 适配：默认接入调度器队列以对齐组件更新批次。
 */
import { queuePostFlushCb, queuePreFlushCb } from './scheduler.ts'
import type {
  WatchCallback,
  WatchOptions,
  WatchScheduler,
  WatchSource,
  WatchStopHandle,
} from '@/reactivity/index.ts'
import { createWatch } from '@/reactivity/index.ts'

/**
 * Runtime 层封装的 `watch`，默认接入调度器的 `pre` 队列。
 *
 * @remarks
 * - 默认 `flush` 为 `pre`，与组件更新保持同一批次；`post` 走后置队列，`sync` 仍同步。
 * - 如未提供调度器（纯 reactivity 场景），`pre/post` 会在 `createWatch` 内退化为微任务占位。
 *
 * @param source - 依赖源或 getter
 * @param callback - 变更回调
 * @param options - 额外 watch 配置
 * @returns 用于停止 watch 的句柄
 */
export function watch<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
  options: WatchOptions = {},
): WatchStopHandle {
  const flush = options.flush ?? 'pre'
  const scheduler = options.scheduler ?? resolveScheduler(flush)

  return createWatch(source, callback, {
    ...options,
    flush,
    scheduler,
  })
}

/**
 * 按 `flush` 选项选择调度器，实现 `pre/post/sync` 三种时机。
 *
 * @param flush 用户指定的刷新时机。
 * @returns 对应的调度函数；`sync` 返回 `undefined` 走同步。
 */
function resolveScheduler(flush: WatchOptions['flush']): WatchScheduler | undefined {
  if (flush === 'pre') {
    return (job) => {
      queuePreFlushCb(job)
    }
  }

  if (flush === 'post') {
    return (job) => {
      queuePostFlushCb(job)
    }
  }

  return undefined
}
