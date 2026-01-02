/**
 * `v-model` 绑定值的读写工具函数。
 *
 * `v-model` 支持两种绑定目标：
 * - Ref 对象：通过 `.value` 读写
 * - 普通值：只读，写入时在开发模式下发出警告
 *
 * 本模块聚焦值层面的读写与只读告警，不关心控件类型。
 */
import { jsxModelBindingReadonlyTarget } from '@/messages/index.ts'
import { isRef } from '@/reactivity/index.ts'
import { __DEV__ } from '@/shared/index.ts'

/**
 * 读取 model 绑定的当前值。
 *
 * @param modelBinding - `v-model` 绑定目标
 * @returns 解析得到的当前值
 */
export function readModelValue(modelBinding: unknown): unknown {
  return isRef(modelBinding) ? modelBinding.value : modelBinding
}

/**
 * 设置 model 绑定的新值。
 *
 * @param modelBinding - `v-model` 绑定目标
 * @param value - 要写入的值
 */
export function setModelValue(modelBinding: unknown, value: unknown): void {
  if (isRef(modelBinding)) {
    ;(modelBinding as { value: unknown }).value = value

    return
  }

  /* 非 Ref 无法写入，开发模式下提醒调用方绑定为可写来源。 */
  if (__DEV__) {
    console.warn(jsxModelBindingReadonlyTarget, { modelBinding, value })
  }
}
