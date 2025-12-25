/**
 * `v-model` 转换过程中的警告函数。
 *
 * 在开发模式下，当检测到以下情况时发出警告：
 * - 在非表单元素上使用 `v-model`
 * - `v-model` 与现有属性（如 `value`、`checked`、`onChange`）冲突
 */
import { jsxModelBindingConflictWarning, jsxModelBindingNonFormWarning } from '@/messages/index.ts'
import { __DEV__ } from '@/shared/index.ts'

/**
 * 警告：在非表单元素上使用 `v-model`。
 *
 * `v-model` 仅支持原生表单元素（input、textarea、select），
 * 在其他元素上使用时会发出此警告。
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
 */
export function warnConflictProps(type: string, conflicts: string[]): void {
  if (__DEV__ && conflicts.length > 0) {
    console.warn(jsxModelBindingConflictWarning(type, conflicts))
  }
}
