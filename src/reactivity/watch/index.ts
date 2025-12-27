/**
 * Watch API 的聚合出口。
 *
 * @remarks
 * - 导出 `watch` 函数用于建立响应式监听。
 * - 导出相关类型定义：`WatchCallback`、`WatchOptions`、`WatchSource`、`WatchStopHandle`、`WatchCleanup`。
 */

export type {
  WatchCallback,
  WatchCleanup,
  WatchOptions,
  WatchSource,
  WatchStopHandle,
} from './core.ts'
export { createWatch } from './core.ts'
