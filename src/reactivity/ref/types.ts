import type { refFlag } from '../contracts/index.ts'

/**
 * Ref 接口：暴露响应式值的访问器，并携带 refFlag 标记。
 *
 * @remarks
 * - 通过 `value` 属性读写响应式值，读取时会收集依赖，写入时会触发依赖。
 * - `refFlag` 符号属性用于 `isRef()` 类型守卫的识别。
 *
 * @public
 */
export interface Ref<T = unknown> {
  /**
   * 通过 `refFlag` 标识当前对象为 Ref，用于类型守卫。
   *
   * @remarks
   * - 该属性为只读，由 Ref 实现类在构造时设置。
   */
  readonly [refFlag]: true

  /**
   * 响应式值的读写入口。
   *
   * @remarks
   * - 读取时会收集当前活跃的 effect 为依赖。
   * - 写入时会触发所有依赖的 effect 重新执行。
   */
  value: T
}
