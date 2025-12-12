import { normalizePath } from './paths.ts'
import type { RouteLocation, Router, RouterConfig, RouteRecord } from './types.ts'
import { routerInjectionKey } from './injection.ts'
import type { InjectionKey, InjectionToken } from '@/runtime-core/index.ts'
import type { Ref } from '@/reactivity/index.ts'
import { ref } from '@/reactivity/index.ts'

interface RouterInstallApp {
  provide<T>(key: InjectionKey<T>, value: T): void
  provide(key: InjectionToken, value: unknown): void
  unmount?: () => void
}

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
  const currentRoute: Ref<RouteLocation> = ref(matchRoute(getCurrentBrowserPath()))

  /* `popstate` 触发时同步最新路径到路由状态。 */
  const onPopState = (): void => {
    currentRoute.value = matchRoute(getCurrentBrowserPath())
  }

  let listening = false

  /** 记录已安装该 router 的 app，避免重复 install 并用于卸载时闭环 stop。 */
  const installedApps = new Set<RouterInstallApp>()
  /** 记录已被当前 router 包装过 unmount 的 app，避免重复包装。 */
  const wrappedUnmountApps = new WeakSet<RouterInstallApp>()

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
      if (installedApps.has(app)) {
        return
      }

      const isFirstInstall = installedApps.size === 0

      installedApps.add(app)

      if (isFirstInstall) {
        start()
      }

      if (typeof app.unmount === 'function' && !wrappedUnmountApps.has(app)) {
        const rawUnmount = app.unmount.bind(app)

        app.unmount = () => {
          try {
            rawUnmount()
          } finally {
            installedApps.delete(app)

            if (installedApps.size === 0) {
              stop()
            }
          }
        }

        wrappedUnmountApps.add(app)
      }

      app.provide(routerInjectionKey, router)
    },
  }

  return router
}
