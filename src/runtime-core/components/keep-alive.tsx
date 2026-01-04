/**
 * `KeepAlive` 组件实现：缓存匹配的子组件并支持激活/失活切换。
 * 以渲染函数形式包装，隔离缓存策略与宿主渲染逻辑。
 * 负责标记需要保活的子树并与上下文协作完成激活/失活。
 */
import type { ComponentInstance } from '../component/context.ts'
import { getCurrentInstance } from '../component/context.ts'
import { onUnmounted } from '../component/lifecycle.ts'
import { asRuntimeVirtualNode } from '../virtual-node.ts'
import { watch } from '../watch.ts'
import { pruneCache, refreshKeyOrder, resolveMax } from './keep-alive/cache.ts'
import type { KeepAlivePattern } from './keep-alive/utils.ts'
import {
  getComponentName,
  isComponentChild,
  resolveCacheKey,
  resolveChildren,
  shouldIncludeComponent,
} from './keep-alive/utils.ts'
import type { SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'
import {
  runtimeCoreKeepAliveInvalidChild,
  runtimeCoreKeepAliveMultipleChildren,
} from '@/messages/index.ts'
import { __DEV__ } from '@/shared/index.ts'

/** `KeepAlive` 可配置的过滤规则与容量限制。 */
export interface KeepAliveProps {
  /** 允许缓存的组件名模式，不匹配时不做缓存。 */
  include?: KeepAlivePattern
  /** 排除缓存的组件名模式，优先级低于 `include`。 */
  exclude?: KeepAlivePattern
  /** 最大缓存数量，超出后按 LRU 淘汰。 */
  max?: number
}

/**
 * 缓存符合规则的子组件实例，支持激活/失活切换的内置组件。
 *
 * @param props - 过滤规则与最大缓存数
 * @returns 渲染的子节点或片段占位
 */
export const KeepAlive: SetupComponent<KeepAliveProps> = (props) => {
  const instance = getCurrentInstance() as
    | ComponentInstance<unknown, WeakKey, unknown, SetupComponent>
    | undefined
  const keepAliveContext = instance?.keepAliveContext

  if (keepAliveContext) {
    keepAliveContext.max = resolveMax(props.max)

    /* 监听 include/exclude 变化，确保缓存与新规则一致。 */
    watch(
      () => {
        return [props.include, props.exclude]
      },
      () => {
        pruneCache(keepAliveContext, (name) => {
          return shouldIncludeComponent(name, props.include, props.exclude)
        })
      },
      { flush: 'post' },
    )

    onUnmounted(() => {
      /* 组件卸载时清空缓存，释放宿主资源。 */
      pruneCache(keepAliveContext, () => {
        return false
      })
    })
  }

  return () => {
    if (!keepAliveContext) {
      /* 无保活上下文时原样渲染，避免创建多余占位。 */
      return props.children
    }

    const { children, hasMultipleChildren } = resolveChildren(props.children)
    const child = children[0]

    if (!child) {
      return undefined
    }

    if (hasMultipleChildren) {
      if (__DEV__) {
        console.warn(runtimeCoreKeepAliveMultipleChildren, children)
      }

      return props.children
    }

    if (!isComponentChild(child)) {
      if (__DEV__) {
        console.warn(runtimeCoreKeepAliveInvalidChild, child)
      }

      return props.children
    }

    const cacheKey = resolveCacheKey(child)
    const name = getComponentName(child)

    if (!shouldIncludeComponent(name, props.include, props.exclude)) {
      return child
    }

    const cachedEntry = keepAliveContext.cache.get(cacheKey)
    const keepAliveChild = asRuntimeVirtualNode<unknown, WeakKey, unknown>(child as VirtualNode)

    keepAliveChild.shouldKeepAlive = true
    keepAliveChild.keepAliveCacheKey = cacheKey
    keepAliveChild.keepAliveInstance = keepAliveContext

    if (cachedEntry) {
      refreshKeyOrder(keepAliveContext.keys, cacheKey)
      keepAliveChild.keptAlive = true
      keepAliveChild.component = cachedEntry.vnode.component
      keepAliveChild.el = cachedEntry.vnode.el
      keepAliveChild.anchor = cachedEntry.vnode.anchor
      keepAliveChild.handle = cachedEntry.vnode.handle
    }

    return keepAliveChild
  }
}

/**
 * 判断组件类型是否为内置 `KeepAlive`。
 *
 * @param type - 需要检测的组件类型
 * @returns 是否为 `KeepAlive`
 */
export function isKeepAliveType(type: unknown): type is typeof KeepAlive {
  return type === KeepAlive
}
