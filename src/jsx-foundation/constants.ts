/**
 * `jsx-foundation` 的运行时标识常量。
 *
 * @remarks
 * - `virtualNodeFlag` 用于标记对象为 `virtualNode`，供 `isVirtualNode` 守卫识别。
 * - 使用 `Symbol` 避免与用户 `props` 冲突。
 */
export const virtualNodeFlag = Symbol('isVirtualNode')

/**
 * 文本节点类型标识：用于区分文本 `virtualNode` 与元素/组件节点。
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Text = Symbol('Text')

/**
 * 注释节点类型标识：用于“空渲染占位”等场景，保证区间/锚点语义稳定。
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Comment = Symbol('Comment')
