import { normalizePath } from './paths.ts'
import type { RouteLocation, Router, RouterConfig, RouteRecord } from './types.ts'
import type { Ref } from '@/reactivity/index.ts'
import { ref } from '@/reactivity/index.ts'

const canUseWindowEvents =
  globalThis.window !== undefined && typeof window.addEventListener === 'function'

function getCurrentBrowserPath(): string {
  if (!canUseWindowEvents) return '/'

  return globalThis.location.pathname || '/'
}

export function createRouter(config: RouterConfig): Router {
  const routeMap = new Map<string, RouteRecord['component']>()

  for (const record of config.routes) {
    routeMap.set(normalizePath(record.path), record.component)
  }

  const { fallback } = config

  const matchRoute = (rawPath: string): RouteLocation => {
    const normalized = normalizePath(rawPath)
    const component = routeMap.get(normalized) ?? fallback

    return { path: normalized, component }
  }

  const currentRoute: Ref<RouteLocation> = ref<RouteLocation>(matchRoute(getCurrentBrowserPath()))

  const onPopState = (): void => {
    currentRoute.value = matchRoute(getCurrentBrowserPath())
  }

  let listening = false

  const start = (): void => {
    if (!canUseWindowEvents || listening) return
    globalThis.addEventListener('popstate', onPopState)
    listening = true
    // 同步一次当前路径，防止在初始化前已有 pushState 调用。
    currentRoute.value = matchRoute(getCurrentBrowserPath())
  }

  const stop = (): void => {
    if (!canUseWindowEvents || !listening) return
    globalThis.removeEventListener('popstate', onPopState)
    listening = false
  }

  const navigate = (path: string): void => {
    const target = normalizePath(path)

    if (target === currentRoute.value.path) return

    if (canUseWindowEvents) {
      globalThis.history.pushState(null, '', target)
    }

    currentRoute.value = matchRoute(target)
  }

  return {
    currentRoute,
    navigate,
    start,
    stop,
  }
}
