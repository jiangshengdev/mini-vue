/**
 * 路由注入工具：提供注入 `Key` 与读取已安装路由器的助手。
 */
import type { Router } from './types.ts'
import { routerNotFound } from '@/messages/index.ts'
import { inject } from '@/runtime-core/index.ts'
import type { InjectionKey } from '@/shared/index.ts'

/**
 * `Router` 在组件树中的注入 `Key`。
 *
 * @remarks
 * - 由 `router.install(app)` 写入，供 `useRouter` 和路由组件读取。
 * - 使用 `Symbol` 确保唯一性，避免与其他注入 key 冲突。
 */
export const routerInjectionKey: InjectionKey<Router> = Symbol('router') as InjectionKey<Router>

/**
 * 从当前组件树中获取注入的 `Router` 实例。
 *
 * @remarks
 * - 仅在组件 `setup` 阶段可用，因为依赖 `inject` 的上下文。
 * - 若未找到 `router`（未安装或在组件树外调用），则抛出错误。
 *
 * @throws 当组件树中未注入 `router` 时抛出错误。
 *
 * @returns 当前组件上下文中的路由器实例
 *
 * @beta
 */
export function useRouter(): Router {
  const router = inject(routerInjectionKey)

  if (!router) {
    throw new Error(routerNotFound, { cause: routerInjectionKey })
  }

  return router
}
