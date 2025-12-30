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
 */
export function warnNonFormElement(type: string, props: unknown): void {
  if (__DEV__) {
    console.warn(jsxModelBindingNonFormWarning(type), props)
  }
}

/**
 * 警告：`v-model` 与现有属性冲突。
 */
export function warnConflictProps(type: string, conflicts: string[], props: unknown): void {
  if (__DEV__ && conflicts.length > 0) {
    console.warn(jsxModelBindingConflictWarning(type, conflicts), props)
  }
}
