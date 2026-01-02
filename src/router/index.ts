/**
 * `router` 子域对外导出入口，集中暴露 `RouterLink/RouterView` 与核心导航 API。
 * 聚合组件与导航构件，保证消费端以单一导入路径获取路由能力。
 * 不承担具体路由逻辑，实现细节由 `components` 与 `core` 子目录维护。
 */
export { RouterLink, RouterView } from './components/index.ts'
export type { RouterLinkProps, RouterViewProps } from './components/index.ts'
export { createRouter, normalizePath, routerInjectionKey, useRouter } from './core/index.ts'
export type { RouteLocation, Router, RouterConfig, RouteRecord } from './core/index.ts'
