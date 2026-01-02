/**
 * `router` 核心能力聚合导出：创建路由器、注入与路径归一化工具。
 * 仅做 API 聚合，不追加逻辑，保持核心模块的树状依赖清晰。
 */
export { createRouter } from './create-router.ts'
export { routerInjectionKey, useRouter } from './injection.ts'
export { normalizePath } from './paths.ts'
export type { RouteLocation, Router, RouterConfig, RouteRecord } from './types.ts'
