import type { refFlag } from '../contracts/index.ts'

/**
 * Ref 接口暴露响应式值的访问器，并携带 refFlag 标记。
 *
 * @public
 */
export interface Ref<T = unknown> {
  /** 通过 `refFlag` 标识当前对象为 `Ref`，用于类型守卫。 */
  readonly [refFlag]: true
  /** 响应式值的读写入口。 */
  value: T
}
