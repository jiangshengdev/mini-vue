import { routerInjectionKey } from './injection.ts'
import { getQueryAndHash, normalizePath } from './paths.ts'
import type { RouteLocation, Router, RouterConfig, RouteRecord } from './types.ts'
import { routerDuplicateInstallOnApp } from '@/messages/index.ts'
import type { Ref } from '@/reactivity/index.ts'
import { ref } from '@/reactivity/index.ts'

/**
 * `Router` 作为插件安装时，`app` 侧需要具备的最小能力子集。
 *
 * @remarks
 * - 该类型避免把运行时 `AppInstance` 强耦合进 `router` 包。
 * - 仅用于 `router.install(app)` 的参数约束与内部 bookkeeping。
 */
type InstallableApp = Parameters<Router['install']>[0]

/** 是否处于浏览器环境并支持 `history/popstate` 事件。 */
const canUseWindowEvents =
  globalThis.window !== undefined && typeof window.addEventListener === 'function'

/** 记录已安装任意 `router` 的 `app`，避免重复安装。 */
const appsWithRouter = new WeakSet<InstallableApp>()

/**
 * 读取当前浏览器路径；无 `window` 环境时退回根路径。
 */
function getCurrentBrowserPath(): string {
  if (!canUseWindowEvents) return '/'

  return globalThis.location.pathname || '/'
}

/**
 * 基于 `history` 的最小路由实现，封装路径匹配与状态同步。
 */
export function createRouter(config: RouterConfig): Router {
  const routeMap = new Map<string, RouteRecord['component']>()

  /* 预构建 `path` → 组件的映射，提升匹配效率。 */
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

    /*
     * 当前路由记录仅支持单层结构，`matched` 仅包含首层组件；
     * 嵌套 `RouterView` 会在超出 `matched` 长度时渲染为空以避免递归。
     */
    return { path: normalized, component, matched: [component] }
  }

  /* 用当前地址初始化路由状态，确保首屏渲染一致。 */
  const currentRoute: Ref<RouteLocation> = ref(matchRoute(getCurrentBrowserPath()))

  /* `popstate` 触发时同步最新路径到路由状态。 */
  const onPopState = (): void => {
    currentRoute.value = matchRoute(getCurrentBrowserPath())
  }

  let listening = false

  /** 记录已安装该 `router` 的 `app`，避免重复 install 并用于卸载时闭环 `stop`。 */
  const installedApps = new Set<InstallableApp>()
  /** 记录已被当前 `router` 包装过 `unmount` 的 `app`，避免重复包装。 */
  const wrappedUnmountApps = new WeakSet<InstallableApp>()

  /**
   * 开始监听浏览器前进/后退，并立即同步一次路径。
   */
  const start = (): void => {
    /* 无浏览器环境或已监听时直接返回，避免重复绑定。 */
    if (!canUseWindowEvents || listening) return
    globalThis.addEventListener('popstate', onPopState)
    listening = true
    /* 同步一次当前路径，防止在初始化前已有 `pushState` 调用。 */
    currentRoute.value = matchRoute(getCurrentBrowserPath())
  }

  /**
   * 停止路由监听，移除 `popstate` 绑定。
   */
  const stop = (): void => {
    /* 若未启动或不在浏览器中则无需处理。 */
    if (!canUseWindowEvents || !listening) return
    globalThis.removeEventListener('popstate', onPopState)
    listening = false
  }

  /**
   * 主动导航到目标路径，写入 `history` 并刷新 `currentRoute`。
   */
  const navigate = (path: string): void => {
    const normalizedPath = normalizePath(path)
    const queryAndHash = getQueryAndHash(path)
    const historyTarget = `${normalizedPath}${queryAndHash}`

    if (canUseWindowEvents) {
      const currentUrl = `${globalThis.location.pathname ?? ''}${globalThis.location.search ?? ''}${globalThis.location.hash ?? ''}`

      if (historyTarget !== currentUrl) {
        globalThis.history.pushState(null, '', historyTarget)
      }
    }

    currentRoute.value = matchRoute(normalizedPath)
  }

  const router: Router = {
    currentRoute,
    navigate,
    start,
    stop,
    /**
     * 作为应用插件安装：注入 `router` 并按需启动/停止监听。
     *
     * @remarks
     * - 首次 install 时自动 `start`。
     * - 当所有安装该 `router` 的 `app` 都卸载后自动 `stop`。
     */
    install(app) {
      if (appsWithRouter.has(app)) {
        throw new Error(routerDuplicateInstallOnApp)
      }

      /* 防御重复 install：当前 `router` 已记录该 `app` 时直接忽略。 */
      if (installedApps.has(app)) {
        return
      }

      /* 只有从 0 → 1 时才需要启动监听，避免多 `app` 场景重复 `start`。 */
      const isFirstInstall = installedApps.size === 0

      installedApps.add(app)
      appsWithRouter.add(app)

      if (isFirstInstall) {
        start()
      }

      /*
       * 若 `app` 支持 `unmount`，则在其卸载链路中回收 `installedApps` 计数。
       *
       * @remarks
       * - 用 `WeakSet` 防止重复包装（同一个 `app` 可能多次 install）。
       * - 用 `finally` 确保 `rawUnmount` 抛错时也能完成 `stop` 判断。
       */
      if (typeof app.unmount === 'function' && !wrappedUnmountApps.has(app)) {
        const rawUnmount = app.unmount.bind(app)

        /*
         * 用包装函数替换 `app.unmount`：在用户卸载后回收计数，并在最后一个 `app` 卸载时 `stop`。
         */
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

      /* 通过 `app.provide` 把 `router` 注入到组件树中，供 `useRouter/RouterLink/RouterView` 读取。 */
      app.provide(routerInjectionKey, router)
    },
  }

  return router
}
