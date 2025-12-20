import type { Router } from './types.ts'
import { routerNotFound } from '@/messages/index.ts'
import { inject } from '@/runtime-core/index.ts'
import type { InjectionKey } from '@/shared/index.ts'

/** `Router` 在组件树中的注入 `Key`（由 `router.install` 写入、`useRouter` 读取）。 */
export const routerInjectionKey: InjectionKey<Router> = Symbol('router') as InjectionKey<Router>

/**
 * 读取当前组件树注入的 `router`。
 *
 * 注意：当前实现仅保证在组件 `setup` 阶段可用。
 *
 * @beta
 */
export function useRouter(): Router {
  const router = inject(routerInjectionKey)

  if (!router) {
    throw new Error(routerNotFound)
  }

  return router
}
