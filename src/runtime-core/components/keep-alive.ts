import type { PatchEnvironment } from '../patch/children-environment.ts'
import type { PatchResult } from '../patch/types.ts'
import { move, unmount as unmountVirtualNode } from '../patch/utils.ts'
import type { ComponentInstance } from '../component/context.ts'
import { getCurrentInstance } from '../component/context.ts'
import { onUnmounted, queueActivatedHooks, queueDeactivatedHooks } from '../component/lifecycle.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { RuntimeNormalizedVirtualNode } from '../patch/runtime-virtual-node.ts'
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

export interface KeepAliveProps {
  include?: KeepAlivePattern
  exclude?: KeepAlivePattern
  max?: number
}

export const KeepAlive: SetupComponent<KeepAliveProps> = (props) => {
  const instance = getCurrentInstance() as
    | ComponentInstance<unknown, WeakKey, unknown, SetupComponent>
    | undefined
  const keepAliveContext = instance?.keepAliveContext

  if (keepAliveContext) {
    keepAliveContext.max = resolveMax(props.max)

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
      pruneCache(keepAliveContext, () => {
        return false
      })
    })
  }

  return () => {
    if (!keepAliveContext) {
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

export function isKeepAliveType(type: unknown): type is typeof KeepAlive {
  return type === KeepAlive
}

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

export function queueKeepAliveActivated<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, SetupComponent>): void {
  queueActivatedHooks(instance)
  queueComponentSubTreeHooks(instance.subTree, queueActivatedHooks)
}

export function queueKeepAliveDeactivated<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, SetupComponent>): void {
  queueDeactivatedHooks(instance)
  queueComponentSubTreeHooks(instance.subTree, queueDeactivatedHooks)
}

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

function isComponentChild(child: VirtualNode): child is VirtualNode<SetupComponent> {
  return typeof child.type === 'function' && child.type !== Fragment
}

function getComponentName(child: VirtualNode<SetupComponent>): string | undefined {
  if (typeof child.type !== 'function') {
    return undefined
  }

  return child.type.name || undefined
}

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

function resolveCacheKey(child: VirtualNode<SetupComponent>): KeepAliveCacheKey {
  if (child.key !== undefined) {
    return child.key
  }

  return child.type
}

function refreshKeyOrder(keys: Set<KeepAliveCacheKey>, key: KeepAliveCacheKey): void {
  keys.delete(key)
  keys.add(key)
}

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
