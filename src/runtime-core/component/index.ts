/**
 * Runtime-core 组件子域的出口文件，聚合「当前实例获取」与组件挂载相关能力。
 */
export { getCurrentInstance } from './context.ts'
export type { ComponentInstance } from './context.ts'
export { onActivated, onBeforeUpdate, onDeactivated, onMounted, onUnmounted, onUpdated } from './lifecycle.ts'
export { mountComponent } from './mount.ts'
