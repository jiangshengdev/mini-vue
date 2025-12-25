/**
 * 响应式系统内部实现的聚合出口。
 *
 * @remarks
 * - 导出 Proxy 处理器（mutableHandlers 等）供 reactive/readonly 等函数使用。
 * - 导出依赖收集/触发函数（track/trigger/trackEffect/triggerEffects）供内部模块使用。
 */

export {
  mutableHandlers,
  readonlyHandlers,
  shallowReactiveHandlers,
  shallowReadonlyHandlers,
} from './base-handlers.ts'
export { trackEffect, triggerEffects } from './dependency.ts'
export { track, trigger } from './operations.ts'
