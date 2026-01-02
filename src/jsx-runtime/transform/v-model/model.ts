/**
 * 提供 `v-model` 绑定的读写工具，兼容可写的 Ref 与只读的普通值。
 *
 * 非 Ref 目标无法写入时会在开发模式下提示。
 */
import { jsxModelBindingReadonlyTarget } from '@/messages/index.ts'
import { isRef } from '@/reactivity/index.ts'
import { __DEV__ } from '@/shared/index.ts'

/**
 * 读取 `v-model` 绑定的当前值，优先取 Ref 的 `.value`。
 *
 * @param modelBinding - `v-model` 绑定的目标（Ref 或普通值）
 * @returns 绑定目标的当前值
 */
export function readModelValue(modelBinding: unknown): unknown {
  return isRef(modelBinding) ? modelBinding.value : modelBinding
}

/**
 * 写入 `v-model` 绑定：可写 Ref 直接更新，非 Ref 在开发模式下发出无法写入的提示。
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
