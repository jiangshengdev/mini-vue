/**
 * 无法渲染的 `children` 警告，用于开发态提示用户传入了函数/对象等不被支持的子节点。
 */
export const jsxUnsupportedChildWarning = '[jsx] 检测到无法渲染的 children，已被忽略：'

/**
 * `v-model` 出现在非表单元素上的警告。
 *
 * @param type - 当前元素类型
 */
export const jsxVModelNonFormWarning = (type: string) => {
  return `[jsx] v-model 仅支持表单元素，在 <${type}> 上已被忽略`
}

/**
 * `v-model` 覆盖显式传入的属性时的警告。
 *
 * @param type - 当前元素类型
 * @param keys - 被覆盖的属性名列表
 */
export const jsxVModelConflictWarning = (type: string, keys: string[]) => {
  return `[jsx] v-model 将覆盖 <${type}> 上显式传入的属性：${keys.join(', ')}`
}

/** `v-model` 目标不可写时的警告。 */
export const jsxVModelReadonlyTarget = '[jsx] v-model 需要可写的 ref，当前值不可写，已忽略更新'
