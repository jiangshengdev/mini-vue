import type { Router } from './types.ts'
import type { InjectionKey } from '@/runtime-core/index.ts'
import { inject } from '@/runtime-core/index.ts'

export const ROUTER_KEY: InjectionKey<Router> = Symbol('mini-vue-router') as InjectionKey<Router>

/**
 * 读取当前组件树注入的 router。
 *
 * 注意：当前实现仅保证在组件 setup 阶段可用。
 */
export function useRouter(): Router {
  const router = inject(ROUTER_KEY)

  if (!router) {
    throw new Error(
      'useRouter: 未找到 router，请先在 createApp 后调用 app.use(router)，或为 RouterLink/RouterView 显式传入 router props',
    )
  }

  return router
}

/**
 * 将 router 安装到应用 provides 中，供 useRouter/RouterLink/RouterView 注入读取。
 */
export function createRouterPlugin(router: Router) {
  return (app: { provide: (key: PropertyKey, value: unknown) => void }) => {
    app.provide(ROUTER_KEY, router)
  }
}
