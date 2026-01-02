/**
 * Devtools setup state 收集模块。
 *
 * 本模块在开发模式下桥接响应式对象与 Devtools，提供：
 * - 采集入口：按类型收集 ref/reactive/computed 实例
 * - 名称注册：为已采集实例记录调试名称
 * - 暂停窗口：在特定执行段禁用采集，避免噪声
 */
import { __DEV__ } from './env.ts'

export type DevtoolsSetupStateKind = 'computed' | 'reactive' | 'ref' | 'unknown'

export interface DevtoolsSetupStateCollector {
  /** 收集指定类型的响应式对象，供 Devtools 展示。 */
  collect: (value: unknown, kind: DevtoolsSetupStateKind) => void
  /** 可选的名称注册钩子，用于在 Devtools 中展示友好名称。 */
  registerName?: (value: unknown, name: string) => void
}

let currentCollector: DevtoolsSetupStateCollector | undefined
let pausedCollectDepth = 0

/**
 * 在指定 collector 作用域内执行回调，执行结束后恢复旧的 collector。
 *
 * @param collector - Devtools 收集器实例
 * @param fn - 需要在收集上下文中执行的回调
 * @returns 回调的返回值，保持透传
 */
export function withDevtoolsSetupStateCollector<T>(
  collector: DevtoolsSetupStateCollector,
  fn: () => T,
): T {
  if (!__DEV__) {
    return fn()
  }

  const previousCollector = currentCollector

  currentCollector = collector

  try {
    return fn()
  } finally {
    currentCollector = previousCollector
  }
}

/**
 * 暂停当前作用域内的 Devtools 收集，嵌套调用会累计深度。
 *
 * @param fn - 在暂停窗口内执行的回调
 * @returns 回调的返回值
 */
export function withDevtoolsSetupStateCollectionPaused<T>(fn: () => T): T {
  if (!__DEV__) {
    return fn()
  }

  pausedCollectDepth += 1

  try {
    return fn()
  } finally {
    pausedCollectDepth -= 1
  }
}

/**
 * 在未暂停且存在 collector 时收集响应式对象。
 *
 * @param value - 待收集的实例
 * @param kind - 响应式对象类型标识
 */
export function collectDevtoolsSetupState(value: unknown, kind: DevtoolsSetupStateKind): void {
  if (!__DEV__) {
    return
  }

  if (pausedCollectDepth > 0) {
    return
  }

  currentCollector?.collect(value, kind)
}

/**
 * 为已收集的响应式对象注册调试名称。
 *
 * @param value - 待命名的实例
 * @param name - 期望展示的名称
 */
export function registerDevtoolsSetupStateName(value: unknown, name: string): void {
  if (!__DEV__) {
    return
  }

  if (!name) {
    return
  }

  if (!value || typeof value !== 'object') {
    return
  }

  currentCollector?.registerName?.(value, name)
}
