/**
 * JSX 子域消息文案
 *
 * 本模块定义 JSX 运行时相关的警告与错误文案，主要覆盖：
 * - 子节点渲染：不支持的 children 类型警告
 * - v-model 绑定：非表单元素、属性冲突、只读目标等场景的警告
 *
 * 命名约定：`jsx` + 功能域 + 语义（如 `jsxModelBindingConflictWarning`）
 */

/**
 * 无法渲染的 `children` 警告
 *
 * 当 JSX 运行时检测到函数、普通对象等不支持的子节点类型时，
 * 会在开发态输出此警告并忽略该子节点。
 */
export const jsxUnsupportedChildWarning = '[jsx] 检测到无法渲染的 children，已被忽略：'

/**
 * `v-model` 出现在非表单元素上的警告
 *
 * v-model 仅对 `<input>`、`<textarea>`、`<select>` 等表单元素生效，
 * 在其他元素上使用时会输出此警告并忽略绑定。
 *
 * @param type - 当前元素的标签名
 * @returns 说明 v-model 已被忽略的警告文案
 */
export const jsxModelBindingNonFormWarning = (type: string) => {
  return `[jsx] v-model 仅支持表单元素，在 <${type}> 上已被忽略`
}

/**
 * `v-model` 覆盖显式传入属性时的警告
 *
 * 当用户同时使用 v-model 和显式传入 `value`/`checked`/`onInput` 等属性时，
 * v-model 会覆盖这些属性，此警告提示用户避免冲突。
 *
 * @param type - 当前元素的标签名
 * @param keys - 被 v-model 覆盖的属性名列表
 * @returns 说明被覆盖属性的警告文案
 */
export const jsxModelBindingConflictWarning = (type: string, keys: string[]) => {
  return `[jsx] v-model 将覆盖 <${type}> 上显式传入的属性：${keys.join(', ')}`
}

/**
 * `v-model` 目标不可写时的警告
 *
 * v-model 需要绑定到可写的 ref 或 reactive 属性，
 * 当目标为只读（如 `readonly(ref(...))`）时，更新操作会被忽略并输出此警告。
 */
export const jsxModelBindingReadonlyTarget =
  '[jsx] v-model 需要可写的 ref，当前值不可写，已忽略更新'
