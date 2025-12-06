import type { refFlag } from '@/reactivity/shared/constants.ts'

/**
 * Ref 接口暴露响应式值的访问器，并携带 refFlag 标记。
 *
 * @public
 */
export interface Ref<T = unknown> {
  readonly [refFlag]: true
  value: T
}
