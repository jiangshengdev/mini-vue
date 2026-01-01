/**
 * `v-model` 转换过程中的警告函数。
 *
 * 在开发模式下，用于输出 `v-model` 相关的提示信息。
 *
 * @remarks
 * - `jsx-runtime` 侧的组件 `v-model` 转换目前仅使用「冲突告警」。
 * - DOM 表单元素的 `v-model` 适配与「非表单元素」告警由宿主层（如 `runtime-dom`）负责。
 */
import { jsxModelBindingConflictWarning, jsxModelBindingNonFormWarning } from '@/messages/index.ts'
import { __DEV__ } from '@/shared/index.ts'

/**
 * 警告：在非表单元素上使用 `v-model`。
 *
 * @remarks
 * - 该告警主要由宿主层在处理 DOM `v-model` 时触发；这里保留同名函数便于复用文案与策略。
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
 * 警告：`v-model` 与现有属性冲突。
 *
 * 当 props 中已存在将被 `v-model` 覆盖的属性时发出此警告。
 * 例如：同时使用 `v-model` 和 `value`/`checked`/`onChange`。
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
