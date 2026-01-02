/**
 * 基于 `ref` 的状态包装，为响应式值提供 `get/set` 访问器。
 */
import { ref } from './api.ts'
import type { Ref } from './types.ts'

/**
 * 基于 `ref` 的轻量包装，改用 `get/set` 语法读写响应式值。
 *
 * @remarks
 * - 继承 `Ref` 接口，同时提供 `get()`/`set()` 方法作为替代访问方式。
 * - 底层复用 `ref` 实现，保持依赖收集与触发逻辑一致。
 *
 * @public
 */
export interface State<T = unknown> extends Ref<T> {
  /**
   * 读取响应式值，并保持依赖追踪。
   *
   * @returns 当前响应式值
   */
  get(): T

  /**
   * 写入响应式值，沿用 `ref` 的去重与触发逻辑。
   *
   * @param value - 新值
   */
  set(value: T): void
}

/**
 * 创建带 `get/set` 访问器的响应式值，底层复用现有 `ref` 实现。
 *
 * @param value - 初始值，可以是普通值或已有的 Ref
 * @returns State 实例
 *
 * @remarks
 * - 若传入的值已是 Ref，会复用该 Ref 实例。
 * - 提供 `get()`/`set()` 方法作为 `value` 属性的替代访问方式。
 *
 * @public
 */
export function state<T>(value: T | Ref<T>): State<T> {
  /* 复用现有 `ref` 建立响应式值，确保依赖收集与触发逻辑保持一致。 */
  const baseRef = ref(value)

  /* 复用原 `ref` 实例，并补充 `get/set` 访问器保持行为一致。 */
  return Object.assign(baseRef, {
    get(): T {
      return baseRef.value
    },
    set(next: T): void {
      baseRef.value = next
    },
  }) as State<T>
}
