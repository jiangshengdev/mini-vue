/**
 * 标记对象为由 `mini-vue` 创建的 `virtualNode`，用于运行时类型守卫。
 */
export const virtualNodeFlag = Symbol('isVirtualNode')

/**
 * 特殊的文本节点类型标识。
 *
 * @remarks
 * - `createTextVirtualNode` 会将字符串/数字 `children` 包装为该类型，便于渲染层统一处理。
 */

export const Text = Symbol('Text')
