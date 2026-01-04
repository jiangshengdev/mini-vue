/**
 * KeepAlive 内部子系统出口：供 runtime-core 渲染管线复用。
 */
export { createKeepAliveContext } from './context.ts'
export {
  activateKeepAlive,
  cacheKeepAliveSubtree,
  deactivateKeepAlive,
  queueKeepAliveActivated,
  queueKeepAliveDeactivated,
} from './lifecycle.ts'

