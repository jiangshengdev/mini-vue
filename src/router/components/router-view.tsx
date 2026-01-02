/**
 * 路由视图容器：根据当前匹配结果渲染对应组件，并向下注入深度信息。
 */
import { useRouter } from '../core/injection.ts'
import type { Router } from '../core/types.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'
import type { KeepAliveProps } from '@/runtime-core/index.ts'
import { inject, KeepAlive, provide } from '@/runtime-core/index.ts'
import type { InjectionKey } from '@/shared/index.ts'

/**
 * `RouterView` 视图深度的注入 `key`。
 *
 * @remarks
 * - 用于嵌套 `RouterView` 场景下确定当前视图在 `matched` 数组中的索引。
 * - 每层 `RouterView` 会将深度 +1 后向下注入，子级据此读取对应组件。
 */
const routerViewDepthKey: InjectionKey<number> = Symbol('routerViewDepth')

/**
 * 路由匹配结果获取器的类型定义。
 *
 * @remarks
 * - 返回当前路由命中的组件数组，按 `RouterView` 深度索引。
 * - 由最外层 `RouterView` 创建并向下注入，内层复用以保持一致性。
 */
type MatchedGetter = () => SetupComponent[]

/**
 * 路由匹配结果获取器的注入 `key`。
 *
 * @remarks
 * - 首层 `RouterView` 创建 getter 并注入，内层直接复用。
 * - 避免每层都重新读取 `router.currentRoute`，保持渲染一致性。
 */
const routerViewMatchedKey: InjectionKey<MatchedGetter> = Symbol('routerViewMatched')
/**
 * `RouterView` 深度计数的默认起点。
 *
 * @remarks
 * - 设为 -1 使首层 `RouterView` 的深度从 0 开始（-1 + 1 = 0）。
 * - 深度值直接对应 `matched` 数组的索引。
 */
const initialRouterViewDepth = -1

/**
 * `RouterView` 的 `props`，承载路由实例以获取当前视图。
 *
 * @beta
 */
export interface RouterViewProps {
  /** 提供 `currentRoute` 的路由器实例。 */
  router?: Router
  /**
   * 是否使用 `KeepAlive` 缓存当前命中的路由组件。
   *
   * @remarks
   * - `true` 表示启用默认缓存策略。
   * - 传入对象时会作为 `KeepAlive` 的 `props`，用于配置 `max/include/exclude`。
   */
  keepAlive?: boolean | KeepAliveProps
}

/**
 * 动态渲染当前路由对应组件的占位容器。
 *
 * @remarks
 * - 通过注入的深度值确定在 `matched` 数组中的索引位置。
 * - 支持嵌套使用：每层 `RouterView` 渲染 `matched` 中对应深度的组件。
 * - 当深度超出 `matched` 长度时渲染为空，避免无限递归。
 *
 * @param props - 组件的输入属性
 * @returns 渲染当前路由组件的函数
 *
 * @beta
 */
export const RouterView: SetupComponent<RouterViewProps> = (props) => {
  const router = props.router ?? useRouter()

  /* 读取父级注入的深度，首层默认为 -1，加 1 后得到当前深度。 */
  const parentDepth = inject(routerViewDepthKey, initialRouterViewDepth)
  const depth = parentDepth + 1

  /* 读取父级注入的匹配结果获取器，首层则创建新的 getter。 */
  const parentGetMatched = inject(routerViewMatchedKey, undefined)
  const getMatched: MatchedGetter =
    parentGetMatched ??
    (() => {
      return router.currentRoute.value.matched
    })

  /* 向子级注入当前深度与匹配结果获取器。 */
  provide(routerViewDepthKey, depth)
  provide(routerViewMatchedKey, getMatched)

  /**
   * 渲染函数：根据深度从 `matched` 中取出对应组件并渲染。
   *
   * @returns 当前匹配组件的虚拟节点
   */
  return () => {
    const matchedComponents = getMatched()
    const MatchedComponent = matchedComponents[depth]

    /* 深度超出 `matched` 长度时返回空，避免渲染不存在的组件。 */
    if (!MatchedComponent) {
      return undefined
    }

    const matchedVirtualNode = <MatchedComponent />

    if (!props.keepAlive) {
      return matchedVirtualNode
    }

    if (props.keepAlive === true) {
      return <KeepAlive>{matchedVirtualNode}</KeepAlive>
    }

    return <KeepAlive {...props.keepAlive}>{matchedVirtualNode}</KeepAlive>
  }
}
