/**
 * 标记对象为由 mini-vue 创建的 virtualNode，用于运行时类型守卫。
 */
export const virtualNodeFlag = Symbol('isVirtualNode')

/**
 * 特殊的文本节点类型标识。
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Text = Symbol('Text')
