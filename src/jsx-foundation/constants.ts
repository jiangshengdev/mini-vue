/**
 * 标记对象为由 `mini-vue` 创建的 `virtualNode`，用于运行时类型守卫。
 *
 * @remarks
 * - 使用 `Symbol` 而非字符串键，确保标识不会与用户 `props` 冲突。
 * - `isVirtualNode` 守卫函数通过检测该标记区分普通对象与内部节点结构。
 */
export const virtualNodeFlag = Symbol('isVirtualNode')

/**
 * 特殊的文本节点类型标识，用于区分文本 `virtualNode` 与元素/组件节点。
 *
 * @remarks
 * - `createTextVirtualNode` 会将字符串/数字 `children` 包装为该类型。
 * - 渲染层（`runtime-core`）根据 `type === Text` 判断是否需要创建 DOM 文本节点。
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Text = Symbol('Text')
