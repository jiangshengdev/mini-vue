/**
 * 路由器创建入口：封装路径归一化、导航状态管理与插件安装流程。
 * 聚合浏览器 `popstate` 监听、路由匹配与当前路由的响应式状态。
 * 仅处理单层路由记录，复杂嵌套路由交由 `RouterView`/`matched` 约束控制。
 */
import { routerInjectionKey } from './injection.ts'
import { getHash, getQueryAndHash, getSearch, normalizePath } from './paths.ts'
import type { RouteLocation, Router, RouterConfig, RouteRecord } from './types.ts'
import { routerDuplicateInstallOnApp } from '@/messages/index.ts'
import type { Ref } from '@/reactivity/index.ts'
import { ref } from '@/reactivity/index.ts'
import type { PluginInstallApp } from '@/shared/index.ts'

/**
 * 检测当前环境是否为浏览器且可绑定 `popstate` 事件。
 *
 * @remarks
 * - 用于在 SSR 或非浏览器环境下跳过事件绑定与 history 操作。
 * - 以 `window.addEventListener` 作为「可监听导航事件」的最小判定条件。
 */
const canUseWindowEvents =
  globalThis.window !== undefined && typeof window.addEventListener === 'function'

/**
 * 记录已安装任意 `router` 的 `app` 实例。
 *
 * @remarks
 * - 用于防止同一个 `app` 重复安装不同的 `router`。
 * - 使用 `WeakSet` 避免阻止 `app` 被垃圾回收。
 */
const appsWithRouter = new WeakSet<PluginInstallApp>()

/**
 * 读取当前浏览器路径。
 *
 * @remarks
 * - 无 `window` 环境时退回根路径 `/`，确保 SSR 场景下有合理默认值。
 * - 包含 `pathname/search/hash`，用于保持地址栏与 `currentRoute` 一致。
 *
 * @returns 带查询与 hash 的浏览器当前路径
 */
function getCurrentBrowserPath(): string {
  if (!canUseWindowEvents) {
    return '/'
  }

  const { pathname = '/', search = '', hash = '' } = globalThis.location ?? {}

  return `${pathname || '/'}${search}${hash}`
}

/**
 * 基于 `history` API 的最小路由实现，封装路径匹配与状态同步。
 *
 * @remarks
 * - 支持作为插件安装到 `app`，自动管理 `popstate` 监听的生命周期。
 * - 路由匹配采用精确匹配策略，未命中时使用 `fallback` 组件。
 * - 当前仅支持单层路由结构，嵌套路由通过 `matched` 数组长度控制。
 *
 * @param config - 路由表与兜底组件配置
 * @returns 封装导航能力的路由器实例
 *
 * @beta
 */
export function createRouter(config: RouterConfig): Router {
  /** 路径到组件的映射表，用于 O(1) 时间复杂度的路由匹配。 */
  const routeMap = new Map<string, RouteRecord['component']>()

  /* 预构建 `path` → 组件的映射，提升匹配效率。 */
  for (const record of config.routes) {
    routeMap.set(normalizePath(record.path), record.component)
  }

  const { fallback } = config

  /**
   * 将原始路径解析为路由定位信息。
   *
   * @remarks
   * - 路径会先经过归一化处理（去 query/hash、补前导斜杠等）。
   * - 未命中任何路由记录时使用 `fallback` 组件。
   * - `matched` 数组当前仅包含单个组件，为嵌套路由预留扩展空间。
   *
   * @param rawPath - 原始导航路径
   * @returns 归一化后的路由定位信息
   */
  const matchRoute = (rawPath: string): RouteLocation => {
    const normalized = normalizePath(rawPath)
    const query = getSearch(rawPath)
    const hash = getHash(rawPath)
    const fullPath = `${normalized}${query}${hash}`
    const component = routeMap.get(normalized) ?? fallback

    /*
     * 当前路由记录仅支持单层结构，`matched` 仅包含首层组件；
     * 嵌套 `RouterView` 会在超出 `matched` 长度时渲染为空以避免递归。
     */
    return { path: normalized, fullPath, query, hash, component, matched: [component] }
  }

  /* 用当前浏览器地址初始化路由状态，确保首屏渲染与 URL 一致。 */
  const currentRoute: Ref<RouteLocation> = ref(matchRoute(getCurrentBrowserPath()))

  /**
   * `popstate` 事件处理器：浏览器前进/后退时同步路由状态。
   *
   * @remarks
   * - 仅在 `start()` 后生效，`stop()` 后解绑。
   * - 读取当前浏览器路径并更新 `currentRoute`。
   *
   * @returns 无返回值
   */
  const onPopState = (): void => {
    currentRoute.value = matchRoute(getCurrentBrowserPath())
  }

  /** 标记当前 `router` 是否正在监听 `popstate` 事件。 */
  let listening = false

  /**
   * 记录已安装该 `router` 实例的 `app` 集合。
   *
   * @remarks
   * - 用于追踪安装计数，在最后一个 `app` 卸载时自动 `stop`。
   * - 与 `appsWithRouter` 不同，这里只记录当前 `router` 的安装情况。
   */
  const installedApps = new Set<PluginInstallApp>()

  /**
   * 开始监听浏览器前进/后退事件。
   *
   * @remarks
   * - 绑定 `popstate` 事件处理器，用户点击浏览器前进/后退按钮时同步路由状态。
   * - 调用时会立即同步一次当前路径，防止在初始化前已有 `pushState` 调用导致状态不一致。
   * - 重复调用或非浏览器环境下会直接返回，不会重复绑定。
   *
   * @returns 无返回值
   */
  const start = (): void => {
    /* 无浏览器环境或已监听时直接返回，避免重复绑定。 */
    if (!canUseWindowEvents || listening) {
      return
    }

    globalThis.addEventListener('popstate', onPopState)
    listening = true
    /* 同步一次当前路径，防止在初始化前已有 `pushState` 调用。 */
    currentRoute.value = matchRoute(getCurrentBrowserPath())
  }

  /**
   * 停止监听浏览器前进/后退事件。
   *
   * @remarks
   * - 移除 `popstate` 事件绑定，释放资源。
   * - 通常在所有安装该 `router` 的 `app` 都卸载后自动调用。
   * - 未启动或非浏览器环境下会直接返回。
   *
   * @returns 无返回值
   */
  const stop = (): void => {
    /* 若未启动或不在浏览器中则无需处理。 */
    if (!canUseWindowEvents || !listening) {
      return
    }

    globalThis.removeEventListener('popstate', onPopState)
    listening = false
  }

  /**
   * 主动导航到目标路径。
   *
   * @remarks
   * - 将路径写入 `history` 并更新 `currentRoute` 状态。
   * - 路径中的 `query` 和 `hash` 会保留在 URL 中，但不参与路由匹配。
   * - 若目标 URL 与当前 URL 相同，则跳过 `pushState` 避免产生重复历史记录。
   * - 非浏览器环境下仅更新 `currentRoute`，不操作 `history`。
   *
   * @param path - 需要导航到的目标路径
   * @returns 无返回值
   */
  const navigate = (path: string): void => {
    /* 归一化路径用于路由匹配，保留 query/hash 用于 URL 显示。 */
    const normalizedPath = normalizePath(path)
    const queryAndHash = getQueryAndHash(path)
    const historyTarget = `${normalizedPath}${queryAndHash}`

    /* 浏览器环境下写入 history，相同 URL 时跳过以避免重复记录。 */
    if (canUseWindowEvents) {
      const currentUrl = `${globalThis.location.pathname ?? ''}${globalThis.location.search ?? ''}${globalThis.location.hash ?? ''}`

      if (historyTarget !== currentUrl) {
        globalThis.history.pushState(null, '', historyTarget)
      }
    }

    /* 更新响应式路由状态，触发依赖该状态的组件重新渲染。 */
    currentRoute.value = matchRoute(historyTarget)
  }

  const router: Router = {
    name: 'router',
    currentRoute,
    navigate,
    start,
    stop,
    /**
     * 卸载插件时的清理钩子。
     *
     * @param app - 正在卸载的应用实例
     * @returns 无返回值
     */
    uninstall(app) {
      installedApps.delete(app)
      appsWithRouter.delete(app)

      if (installedApps.size === 0) {
        stop()
      }
    },
    /**
     * 作为应用插件安装：注入 `router` 并按需启动/停止监听。
     *
     * @remarks
     * - 首次 install 时自动 `start`。
     * - 当所有安装该 `router` 的 `app` 都卸载后自动 `stop`。
     *
     * @param app - 需要安装路由器的应用实例
     * @returns 无返回值
     */
    install(app) {
      if (appsWithRouter.has(app)) {
        throw new Error(routerDuplicateInstallOnApp, { cause: app })
      }

      /* 防御重复 install：当前 `router` 已记录该 `app` 时直接返回。 */
      if (installedApps.has(app)) {
        return
      }

      /* 首次 install 时需要启动监听，后续 install 复用已有监听。 */
      const isFirstInstall = installedApps.size === 0

      /* 记录安装关系，用于追踪计数和防止重复安装。 */
      installedApps.add(app)
      appsWithRouter.add(app)

      /* 只有从 0 → 1 时才启动监听，避免多 `app` 场景重复 `start`。 */
      if (isFirstInstall) {
        start()
      }

      /* 通过 `app.provide` 把 `router` 注入到组件树中，供 `useRouter/RouterLink/RouterView` 读取。 */
      app.provide(routerInjectionKey, router)
    },
  }

  return router
}
