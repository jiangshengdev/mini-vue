/**
 * `router` 核心能力聚合导出：创建路由器、注入与路径归一化工具。
 */
export { createRouter } from './create-router.ts'
export { routerInjectionKey, useRouter } from './injection.ts'
export { normalizePath } from './paths.ts'
export type { RouteLocation, Router, RouterConfig, RouteRecord } from './types.ts'
