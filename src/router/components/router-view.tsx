import { useRouter } from '../core/injection.ts'
import type { Router } from '../core/types.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'
import { inject, provide } from '@/runtime-core/index.ts'
import type { InjectionKey } from '@/shared/index.ts'

/** `RouterView` 视图深度的注入 `key`，用于避免同组件递归渲染。 */
const routerViewDepthKey: InjectionKey<number> = Symbol('router-view-depth')

/** 路由匹配结果的注入 `key`，按需为子级 `RouterView` 复用。 */
type MatchedGetter = () => SetupComponent[]

const routerViewMatchedKey: InjectionKey<MatchedGetter> = Symbol('router-view-matched')
/** `RouterView` 深度计数的默认起点，使首层深度从 0 开始。 */
const initialRouterViewDepth = -1

/**
 * `RouterView` 的 `props`，承载路由实例以获取当前视图。
 *
 * @beta
 */
export interface RouterViewProps {
  /** 提供 `currentRoute` 的路由器实例。 */
  router?: Router
}

/**
 * 动态渲染当前路由对应组件的占位容器。
 *
 * @beta
 */
export const RouterView: SetupComponent<RouterViewProps> = (props) => {
  const router = props.router ?? useRouter()
  /* 以 -1 为起点，确保首层 `RouterView` 的深度从 0 开始累加。 */
  const parentDepth = inject(routerViewDepthKey, initialRouterViewDepth)
  const depth = parentDepth + 1
  const parentGetMatched = inject(routerViewMatchedKey, undefined)
  const getMatched: MatchedGetter =
    parentGetMatched ??
    (() => {
      return router.currentRoute.value.matched
    })

  provide(routerViewDepthKey, depth)
  provide(routerViewMatchedKey, getMatched)

  /* 渲染函数：读取 `currentRoute` 的组件并输出。 */
  return () => {
    const matchedComponents = getMatched()
    const MatchedComponent = matchedComponents[depth]

    if (!MatchedComponent) {
      return undefined
    }

    return <MatchedComponent />
  }
}
