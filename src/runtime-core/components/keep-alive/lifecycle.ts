/**
 * `KeepAlive` 与渲染管线协作的激活/失活逻辑：
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
  /* 仅缓存被 `KeepAlive` 标记的子树，普通节点不参与保活流程。 */
  if (!runtimeVNode.shouldKeepAlive || !runtimeVNode.keepAliveInstance) {
    return
  }

  /* 缺失缓存 key 时无法建立稳定映射，直接跳过写入。 */
  const cacheKey = runtimeVNode.keepAliveCacheKey

  if (cacheKey === undefined) {
    return
  }

  /* 将当前子树写入缓存，并刷新 LRU 顺序。 */
  setCacheEntry(runtimeVNode.keepAliveInstance, cacheKey, runtimeVNode)

  if (runtimeVNode.component) {
    /* 组件重新进入“激活态”后需要触发 `activated` 钩子（包含子树）。 */
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

  /* 非保活节点或缺失 key 时退化为普通 patch 流程。 */
  if (!keepAliveContext || cacheKey === undefined) {
    next.keptAlive = false

    return patchChild(options, undefined, next, environment)
  }

  /* 未命中缓存条目时按首次挂载处理，不走复用分支。 */
  const cachedEntry = keepAliveContext.cache.get(cacheKey)

  if (!cachedEntry) {
    next.keptAlive = false

    return patchChild(options, undefined, next, environment)
  }

  /* 命中缓存：刷新 LRU，并以缓存 vnode 作为 previous 参与 patch。 */
  refreshKeyOrder(keepAliveContext.keys, cacheKey)
  const previous = cachedEntry.vnode
  const instance = previous.component

  /* 将缓存容器中的宿主节点迁回目标容器，实现“激活”而非重新创建。 */
  move(options, previous, environment.container, environment.anchor)

  if (instance) {
    /* 同步组件实例状态与容器引用，确保后续 patch 与事件绑定正确。 */
    instance.isDeactivated = false
    instance.container = environment.container
  }

  /* 以 `previous` 为基准执行 patch，复用宿主节点并更新子树。 */
  const result = patchChild(options, previous, next, environment)

  /* Patch 后用最新 vnode 覆盖缓存条目，确保下次激活命中最新结构。 */
  setCacheEntry(keepAliveContext, cacheKey, next)

  if (instance) {
    /* 激活完成后统一入队 `activated` 钩子，避免在 patch 中同步执行。 */
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
  /* 非保活节点直接卸载，释放宿主节点与副作用。 */
  if (!runtimeVNode.shouldKeepAlive || !runtimeVNode.keepAliveInstance) {
    unmountVirtualNode(options, runtimeVNode)

    return
  }

  const { keepAliveInstance } = runtimeVNode
  const cacheKey = runtimeVNode.keepAliveCacheKey
  const instance = runtimeVNode.component

  /* 迁移前写入缓存，确保后续激活能够定位到当前子树。 */
  if (cacheKey !== undefined) {
    setCacheEntry(keepAliveInstance, cacheKey, runtimeVNode)
  }

  /* 将宿主节点移动到缓存容器，实现“失活”而非销毁。 */
  move(options, runtimeVNode, keepAliveInstance.storageContainer)

  if (instance) {
    /* 标记为失活并入队 `deactivated` 钩子，递归影响整棵子树。 */
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
  /* 先入队当前实例的钩子，再递归处理其子树中的组件实例。 */
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
  /* 先入队当前实例的钩子，再递归处理其子树中的组件实例。 */
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
  /* 空子树无需入队任何钩子。 */
  if (!subTree) {
    return
  }

  /* 子树在运行时会被规范化为 `RuntimeNormalizedVirtualNode`，以便读取 `component/children` 信息。 */
  const runtimeSubTree = subTree as RuntimeNormalizedVirtualNode<
    HostNode,
    HostElement,
    HostFragment
  >
  const childInstance = runtimeSubTree.component

  if (childInstance) {
    /* 命中组件节点：入队其钩子并继续向下递归组件子树。 */
    queue(childInstance)
    queueComponentSubTreeHooks(childInstance.subTree, queue)

    return
  }

  /* 非组件节点：继续遍历其子节点，直到找到组件实例。 */
  for (const child of runtimeSubTree.children) {
    queueComponentSubTreeHooks(child, queue)
  }
}
