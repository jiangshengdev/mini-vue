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
 *
 * 如果绑定目标是 Ref，则返回其 `.value`；否则直接返回原值。
 *
 * @param modelBinding - `v-model` 绑定的目标（Ref 或普通值）
 * @returns 绑定目标的当前值
 */
export function readModelValue(modelBinding: unknown): unknown {
  return isRef(modelBinding) ? modelBinding.value : modelBinding
}

/**
 * 设置 model 绑定的新值。
 *
 * 如果绑定目标是 Ref，则更新其 `.value`；
 * 如果是普通值，则无法写入，在开发模式下发出警告。
 *
 * @param modelBinding - `v-model` 绑定的目标（Ref 或普通值）
 * @param value - 要设置的新值
 */
export function setModelValue(modelBinding: unknown, value: unknown): void {
  if (isRef(modelBinding)) {
    ;(modelBinding as { value: unknown }).value = value

    return
  }

  /* 非 Ref 目标无法写入，在开发模式下发出警告。 */
  if (__DEV__) {
    console.warn(jsxModelBindingReadonlyTarget, { modelBinding, value })
  }
}
