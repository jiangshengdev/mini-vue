import { normalizePath } from './paths.ts'
import type { RouteLocation, Router, RouterConfig, RouteRecord } from './types.ts'
import { ROUTER_KEY } from './injection.ts'
import type { Ref } from '@/reactivity/index.ts'
import { ref } from '@/reactivity/index.ts'

const canUseWindowEvents =
  globalThis.window !== undefined && typeof window.addEventListener === 'function'

/**
 * 读取当前浏览器路径；无 window 环境时退回根路径。
 */
function getCurrentBrowserPath(): string {
  if (!canUseWindowEvents) return '/'

  return globalThis.location.pathname || '/'
}

/**
 * 基于 history 的最小路由实现，封装路径匹配与状态同步。
 */
export function createRouter(config: RouterConfig): Router {
  const routeMap = new Map<string, RouteRecord['component']>()

  /* 预构建 path → 组件的映射，提升匹配效率。 */
  for (const record of config.routes) {
    routeMap.set(normalizePath(record.path), record.component)
  }

  const { fallback } = config

  /**
   * 将原始路径解析为路由定位，未命中时落兜底组件。
   */
  const matchRoute = (rawPath: string): RouteLocation => {
    const normalized = normalizePath(rawPath)
    const component = routeMap.get(normalized) ?? fallback

    return { path: normalized, component }
  }

  /* 用当前地址初始化路由状态，确保首屏渲染一致。 */
  const currentRoute: Ref<RouteLocation> = ref<RouteLocation>(matchRoute(getCurrentBrowserPath()))

  /* `popstate` 触发时同步最新路径到路由状态。 */
  const onPopState = (): void => {
    currentRoute.value = matchRoute(getCurrentBrowserPath())
  }

  let listening = false

  /**
   * 开始监听浏览器前进/后退，并立即同步一次路径。
   */
  const start = (): void => {
    /* 无浏览器环境或已监听时直接返回，避免重复绑定。 */
    if (!canUseWindowEvents || listening) return
    globalThis.addEventListener('popstate', onPopState)
    listening = true
    // 同步一次当前路径，防止在初始化前已有 pushState 调用。
    currentRoute.value = matchRoute(getCurrentBrowserPath())
  }

  /**
   * 停止路由监听，移除 popstate 绑定。
   */
  const stop = (): void => {
    /* 若未启动或不在浏览器中则无需处理。 */
    if (!canUseWindowEvents || !listening) return
    globalThis.removeEventListener('popstate', onPopState)
    listening = false
  }

  /**
   * 主动导航到目标路径，写入 history 并刷新 currentRoute。
   */
  const navigate = (path: string): void => {
    const target = normalizePath(path)

    /* 目标与当前一致时跳过，避免重复 pushState。 */
    if (target === currentRoute.value.path) return

    if (canUseWindowEvents) {
      globalThis.history.pushState(null, '', target)
    }

    currentRoute.value = matchRoute(target)
  }

  const router: Router = {
    currentRoute,
    navigate,
    start,
    stop,
    install(app) {
      start()
      app.provide(ROUTER_KEY, router)
    },
  }

  return router
}
