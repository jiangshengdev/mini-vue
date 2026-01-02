/**
 * Runtime-core 组件子域的出口文件，聚合「当前实例获取」与组件挂载相关能力。
 * 作为外部入口，仅转发当前实例工具与组件挂载 API，不承载实现细节。
 * 限定导出范围，保持组件子域与其他 runtime 子域的解耦。
 */
export { getCurrentInstance } from './context.ts'
export type { ComponentInstance } from './context.ts'
export {
  onActivated,
  onBeforeUpdate,
  onDeactivated,
  onMounted,
  onUnmounted,
  onUpdated,
} from './lifecycle.ts'
export { mountComponent } from './mount.ts'
