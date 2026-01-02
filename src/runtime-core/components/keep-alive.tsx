/**
 * `KeepAlive` 组件实现：缓存匹配的子组件并支持激活/失活切换。
 * 以渲染函数形式包装，隔离缓存策略与宿主渲染逻辑。
 * 负责标记需要保活的子树并与上下文协作完成激活/失活。
 */
import type { ComponentInstance } from '../component/context.ts'
import { getCurrentInstance } from '../component/context.ts'
import { onUnmounted, queueActivatedHooks, queueDeactivatedHooks } from '../component/lifecycle.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { PatchEnvironment } from '../patch/children-environment.ts'
import type { RuntimeNormalizedVirtualNode } from '../patch/runtime-virtual-node.ts'
import type { PatchResult } from '../patch/types.ts'
import { move, unmount as unmountVirtualNode } from '../patch/utils.ts'
import type { RendererOptions } from '../renderer.ts'
import { asRuntimeVirtualNode } from '../virtual-node.ts'
import { watch } from '../watch.ts'
import type { KeepAliveCacheKey, KeepAliveContext } from './keep-alive-context.ts'
import type { RenderOutput, SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'
import { Comment, Fragment, isVirtualNode } from '@/jsx-foundation/index.ts'
import {
  runtimeCoreKeepAliveInvalidChild,
  runtimeCoreKeepAliveMultipleChildren,
} from '@/messages/index.ts'
import { __DEV__ } from '@/shared/index.ts'

type KeepAlivePattern = string | RegExp | Array<string | RegExp>

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

/**
 * 创建 `KeepAlive` 上下文，初始化缓存容器与宿主能力。
 *
 * @param options - 宿主渲染能力集合
 * @returns 新的上下文实例
 */
export function createKeepAliveContext<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): KeepAliveContext<HostNode, HostElement, HostFragment> {
  return {
    rendererOptions: options,
    storageContainer: options.createElement('div'),
    cache: new Map(),
    keys: new Set(),
  }
}

/**
 * 将标记为保活的子树写入缓存，并在需要时调度激活钩子。
 *
 * @param runtimeVNode - 需要缓存的运行时虚拟节点
 */
export function cacheKeepAliveSubtree<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(runtimeVNode: RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>): void {
  if (!runtimeVNode.shouldKeepAlive || !runtimeVNode.keepAliveInstance) {
    return
  }

  const cacheKey = runtimeVNode.keepAliveCacheKey

  if (cacheKey === undefined) {
    return
  }

  setCacheEntry(runtimeVNode.keepAliveInstance, cacheKey, runtimeVNode)

  if (runtimeVNode.component) {
    queueKeepAliveActivated(runtimeVNode.component)
  }
}

/**
 * 复用缓存子树并重新挂载到目标容器。
 *
 * @param options - 宿主渲染能力
 * @param next - 目标运行时虚拟节点
 * @param environment - 子节点 patch 所需环境
 * @param patchChild - 子节点 patch 函数
 * @returns patch 结果
 */
export function activateKeepAlive<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  next: RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>,
  environment: PatchEnvironment<HostNode, HostElement, HostFragment>,
  patchChild: (
    options: RendererOptions<HostNode, HostElement, HostFragment>,
    previous: NormalizedVirtualNode | undefined,
    next: NormalizedVirtualNode,
    environment: PatchEnvironment<HostNode, HostElement, HostFragment>,
  ) => PatchResult<HostNode>,
): PatchResult<HostNode> {
  const cacheKey = next.keepAliveCacheKey
  const keepAliveContext = next.keepAliveInstance

  if (!keepAliveContext || cacheKey === undefined) {
    next.keptAlive = false

    return patchChild(options, undefined, next, environment)
  }

  const cachedEntry = keepAliveContext.cache.get(cacheKey)

  if (!cachedEntry) {
    next.keptAlive = false

    return patchChild(options, undefined, next, environment)
  }

  refreshKeyOrder(keepAliveContext.keys, cacheKey)
  const previous = cachedEntry.vnode
  const instance = previous.component

  move(options, previous, environment.container, environment.anchor)

  if (instance) {
    instance.isDeactivated = false
    instance.container = environment.container
  }

  const result = patchChild(options, previous, next, environment)

  setCacheEntry(keepAliveContext, cacheKey, next)

  if (instance) {
    queueKeepAliveActivated(instance)
  }

  return result
}

/**
 * 将保活子树迁移到缓存容器并标记失活。
 *
 * @param options - 宿主渲染能力
 * @param runtimeVNode - 需要失活的运行时虚拟节点
 */
export function deactivateKeepAlive<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  runtimeVNode: RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>,
): void {
  if (!runtimeVNode.shouldKeepAlive || !runtimeVNode.keepAliveInstance) {
    unmountVirtualNode(options, runtimeVNode)

    return
  }

  const { keepAliveInstance } = runtimeVNode
  const cacheKey = runtimeVNode.keepAliveCacheKey
  const instance = runtimeVNode.component

  if (cacheKey !== undefined) {
    setCacheEntry(keepAliveInstance, cacheKey, runtimeVNode)
  }

  move(options, runtimeVNode, keepAliveInstance.storageContainer)

  if (instance) {
    instance.isDeactivated = true
    instance.container = keepAliveInstance.storageContainer
    queueKeepAliveDeactivated(instance)
  }
}

/**
 * 将组件及其子树的激活钩子加入调度队列。
 *
 * @param instance - 需要触发激活的组件实例
 */
export function queueKeepAliveActivated<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, SetupComponent>): void {
  queueActivatedHooks(instance)
  queueComponentSubTreeHooks(instance.subTree, queueActivatedHooks)
}

/**
 * 将组件及其子树的失活钩子加入调度队列。
 *
 * @param instance - 需要触发失活的组件实例
 */
export function queueKeepAliveDeactivated<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, SetupComponent>): void {
  queueDeactivatedHooks(instance)
  queueComponentSubTreeHooks(instance.subTree, queueDeactivatedHooks)
}

/**
 * 深度遍历子树并为每个组件入队对应的生命周期钩子。
 *
 * @param subTree - 起始子树
 * @param queue - 激活或失活的入队函数
 */
function queueComponentSubTreeHooks<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  subTree: NormalizedVirtualNode | undefined,
  queue: (instance: ComponentInstance<HostNode, HostElement, HostFragment, SetupComponent>) => void,
): void {
  if (!subTree) {
    return
  }

  const runtimeSubTree = subTree as RuntimeNormalizedVirtualNode<
    HostNode,
    HostElement,
    HostFragment
  >
  const childInstance = runtimeSubTree.component

  if (childInstance) {
    queue(childInstance)
    queueComponentSubTreeHooks(childInstance.subTree, queue)

    return
  }

  for (const child of runtimeSubTree.children) {
    queueComponentSubTreeHooks(child, queue)
  }
}

/**
 * 将外部 children 标准化为可缓存的虚拟节点列表。
 *
 * @param children - 组件渲染输出
 * @returns 过滤后的子节点及多子节点标记
 */
function resolveChildren(children: RenderOutput | undefined): {
  children: VirtualNode[]
  hasMultipleChildren: boolean
} {
  if (Array.isArray(children)) {
    const vnodes = children.filter((child): child is VirtualNode => {
      return isVirtualNode(child) && child.type !== Comment
    })

    return {
      children: vnodes,
      hasMultipleChildren: vnodes.length > 1,
    }
  }

  if (isVirtualNode(children) && children.type !== Comment) {
    return {
      children: [children],
      hasMultipleChildren: false,
    }
  }

  return {
    children: [],
    hasMultipleChildren: false,
  }
}

/**
 * 判断虚拟节点是否为可缓存的组件节点。
 *
 * @param child - 需要校验的虚拟节点
 * @returns 是否为组件类型且非片段
 */
function isComponentChild(child: VirtualNode): child is VirtualNode<SetupComponent> {
  return typeof child.type === 'function' && child.type !== Fragment
}

/**
 * 解析组件名，用于 include/exclude 规则匹配。
 *
 * @param child - 组件虚拟节点
 * @returns 组件名或 `undefined`
 */
function getComponentName(child: VirtualNode<SetupComponent>): string | undefined {
  if (typeof child.type !== 'function') {
    return undefined
  }

  return child.type.name || undefined
}

/**
 * 根据 include/exclude 规则判断组件是否应被缓存。
 *
 * @param name - 组件名
 * @param include - 允许列表
 * @param exclude - 排除列表
 * @returns 是否允许缓存
 */
function shouldIncludeComponent(
  name: string | undefined,
  include: KeepAlivePattern | undefined,
  exclude: KeepAlivePattern | undefined,
): boolean {
  if (include && !matchesPattern(name, include)) {
    return false
  }

  if (exclude && matchesPattern(name, exclude)) {
    return false
  }

  return true
}

/**
 * 校验组件名是否命中模式。
 *
 * @param name - 组件名
 * @param pattern - 字符串、正则或数组模式
 * @returns 是否匹配
 */
function matchesPattern(name: string | undefined, pattern: KeepAlivePattern): boolean {
  if (!name) {
    return false
  }

  if (Array.isArray(pattern)) {
    return pattern.some((item) => {
      return matchesPattern(name, item as KeepAlivePattern)
    })
  }

  if (typeof pattern === 'string') {
    return pattern
      .split(',')
      .map((value) => {
        return value.trim()
      })
      .filter(Boolean)
      .includes(name)
  }

  return pattern.test(name)
}

/**
 * 生成用于缓存的 key，优先使用显式 `key`。
 *
 * @param child - 组件虚拟节点
 * @returns 缓存 key
 */
function resolveCacheKey(child: VirtualNode<SetupComponent>): KeepAliveCacheKey {
  if (child.key !== undefined) {
    return child.key
  }

  return child.type
}

/**
 * 更新 LRU 顺序，将指定 key 标记为最新使用。
 *
 * @param keys - 当前 key 集合
 * @param key - 需要提升的 key
 */
function refreshKeyOrder(keys: Set<KeepAliveCacheKey>, key: KeepAliveCacheKey): void {
  keys.delete(key)
  keys.add(key)
}

/**
 * 写入缓存并维护 LRU 顺序，必要时触发淘汰。
 *
 * @param context - 缓存上下文
 * @param key - 缓存 key
 * @param vnode - 运行时虚拟节点
 */
function setCacheEntry<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  context: KeepAliveContext<HostNode, HostElement, HostFragment>,
  key: KeepAliveCacheKey,
  vnode: RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>,
): void {
  context.cache.set(key, { vnode })
  refreshKeyOrder(context.keys, key)

  if (context.max !== undefined && context.cache.size > context.max) {
    const oldestKey = context.keys.values().next().value

    if (oldestKey !== undefined && oldestKey !== key) {
      pruneCacheEntry(context, oldestKey)
    }
  }
}

/**
 * 按过滤规则遍历缓存并清理不再需要的条目。
 *
 * @param context - 缓存上下文
 * @param filter - 返回 `true` 表示保留
 */
function pruneCache<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  context: KeepAliveContext<HostNode, HostElement, HostFragment>,
  filter: (name: string | undefined) => boolean,
): void {
  for (const [key, entry] of context.cache.entries()) {
    const name = getComponentName(entry.vnode as VirtualNode<SetupComponent>)

    if (!filter(name)) {
      pruneCacheEntry(context, key)
    }
  }
}

/**
 * 移除单个缓存条目并触发卸载。
 *
 * @param context - 缓存上下文
 * @param key - 需要移除的缓存 key
 */
function pruneCacheEntry<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(context: KeepAliveContext<HostNode, HostElement, HostFragment>, key: KeepAliveCacheKey): void {
  const cached = context.cache.get(key)

  if (!cached) {
    return
  }

  cached.vnode.shouldKeepAlive = false
  cached.vnode.keepAliveInstance = undefined
  cached.vnode.keepAliveCacheKey = undefined
  cached.vnode.keptAlive = undefined
  unmountVirtualNode(context.rendererOptions, cached.vnode)
  context.cache.delete(key)
  context.keys.delete(key)
}

/**
 * 解析最大缓存数量，非正数或无效值视为无限制。
 *
 * @param max - 用户传入的最大值
 * @returns 规范化后的数量或 `undefined`
 */
function resolveMax(max: number | undefined): number | undefined {
  if (max === undefined) {
    return undefined
  }

  const normalized = Number(max)

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return undefined
  }

  return Math.trunc(normalized)
}
