/**
 * 标记对象为由 mini-vue 创建的 virtualNode，用于运行时类型守卫。
 */
export const virtualNodeFlag = Symbol('isVirtualNode')
