/**
 * Props 子模块入口。
 *
 * 本模块负责将 VirtualNode 上的 props 映射到真实 DOM 元素，包括：
 * - `patchProps`：统一的属性打补丁入口，按类型分派到各专用处理器
 * - `invokerCacheKey`：事件处理器缓存键，挂在宿主元素上保存稳定的 invoker 映射
 * - `ElementRef`：元素引用类型，支持回调函数或响应式 ref
 */
export { invokerCacheKey } from './event.ts'
export { patchProps } from './patch-props.ts'
export type { ElementRef } from './ref.ts'
