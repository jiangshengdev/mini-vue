/**
 * `router` 子域对外导出入口，统一暴露 `RouterLink/RouterView` 与 `createRouter` 等 API。
 */
export { RouterLink, RouterView } from './components/index.ts'
export type { RouterLinkProps, RouterViewProps } from './components/index.ts'
export { createRouter, normalizePath, routerInjectionKey, useRouter } from './core/index.ts'
export type { RouteLocation, Router, RouterConfig, RouteRecord } from './core/index.ts'
