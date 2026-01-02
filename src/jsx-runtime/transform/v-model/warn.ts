/**
 * 提供 `v-model` 转换过程的警告输出，在开发模式下提示冲突或非法使用。
 *
 * 组件转换仅使用冲突告警，表单相关告警主要由宿主层（如 `runtime-dom`）消费。
 */
import { jsxModelBindingConflictWarning, jsxModelBindingNonFormWarning } from '@/messages/index.ts'
import { __DEV__ } from '@/shared/index.ts'

/**
 * 在非表单元素上使用 `v-model` 时输出警告。
 *
 * @param type - 元素类型（标签名）
 * @param props - 元素的 props（用于调试输出）
 */
export function warnNonFormElement(type: string, props: unknown): void {
  if (__DEV__) {
    console.warn(jsxModelBindingNonFormWarning(type), props)
  }
}

/**
 * 当 `v-model` 将覆盖已有属性时输出冲突警告（如同时存在 `value`/`onChange` 等）。
 *
 * @param type - 元素类型（标签名）
 * @param conflicts - 冲突的属性名列表
 * @param props - 原始 props，便于输出上下文
 */
export function warnConflictProps(type: string, conflicts: string[], props: unknown): void {
  if (__DEV__ && conflicts.length > 0) {
    console.warn(jsxModelBindingConflictWarning(type, conflicts), props)
  }
}
