/**
 * KeepAlive 与渲染管线协作的激活/失活逻辑：
 * - 缓存子树写入与 LRU 维护
 * - patch 阶段激活复用
 * - 卸载阶段失活迁移
 * - 激活/失活钩子调度
 */
import type { ComponentInstance } from '../../component/context.ts'
import { queueActivatedHooks, queueDeactivatedHooks } from '../../component/lifecycle.ts'
import type { NormalizedVirtualNode } from '../../normalize.ts'
import type { PatchEnvironment } from '../../patch/children-environment.ts'
import type { RuntimeNormalizedVirtualNode } from '../../patch/runtime-virtual-node.ts'
import type { PatchResult } from '../../patch/types.ts'
import { move, unmount as unmountVirtualNode } from '../../patch/utils.ts'
import type { RendererOptions } from '../../renderer.ts'
import { refreshKeyOrder, setCacheEntry } from './cache.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'

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
