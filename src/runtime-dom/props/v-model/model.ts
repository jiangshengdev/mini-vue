/**
 * `v-model` 绑定值的读写工具函数。
 *
 * `v-model` 支持两种绑定目标：
 * - Ref 对象：通过 `.value` 读写
 * - 普通值：只读，写入时在开发模式下发出警告
 */
import { jsxModelBindingReadonlyTarget } from '@/messages/index.ts'
import { isRef } from '@/reactivity/index.ts'
import { __DEV__ } from '@/shared/index.ts'

/**
 * 读取 model 绑定的当前值。
 */
export function readModelValue(modelBinding: unknown): unknown {
  return isRef(modelBinding) ? modelBinding.value : modelBinding
}

/**
 * 设置 model 绑定的新值。
 */
export function setModelValue(modelBinding: unknown, value: unknown): void {
  if (isRef(modelBinding)) {
    ;(modelBinding as { value: unknown }).value = value

    return
  }

  if (__DEV__) {
    console.warn(jsxModelBindingReadonlyTarget, { modelBinding, value })
  }
}
