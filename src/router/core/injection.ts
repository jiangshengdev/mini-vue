import type { Router } from './types.ts'
import type { InjectionKey } from '@/shared/index.ts'
import { inject } from '@/runtime-core/index.ts'

/** Router 在组件树中的注入 Key（由 router.install 写入、useRouter 读取）。 */
export const routerInjectionKey: InjectionKey<Router> = Symbol('router') as InjectionKey<Router>

/**
 * 读取当前组件树注入的 router。
 *
 * 注意：当前实现仅保证在组件 setup 阶段可用。
 */
export function useRouter(): Router {
  const router = inject(routerInjectionKey)

  if (!router) {
    throw new Error(
      'useRouter: 未找到 router，请先在 createApp 后调用 app.use(router)，或为 RouterLink/RouterView 显式传入 router props',
    )
  }

  return router
}
