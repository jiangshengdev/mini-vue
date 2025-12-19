import type { ContainerLike, MountContext } from '../environment.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { PatchChildrenEnvironment } from './children-environment.ts'
import { mountChildInEnvironment } from './insertion.ts'
import type { PatchResult } from './types.ts'
import { moveNodes, unmount } from './utils.ts'

/** `children diff` 期间的宿主驱动，统一封装新增/替换/卸载/移动操作。 */
export interface PatchDriver<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  /** 当前 `children` 的宿主容器，作为挂载与移动的默认目标。 */
  readonly container: ContainerLike<HostNode, HostElement, HostFragment>
  /** 默认插入锚点，子节点挂载/移动时参考的位置。 */
  readonly anchor?: HostNode
  /** 透传给子树的上下文（父组件、应用上下文等），保持与 `patchChild` 一致。 */
  readonly context?: MountContext
  /**
   * 在容器中挂载全新的 `vnode`，可按需覆盖锚点与上下文。
   */
  mountNew(
    vnode: NormalizedVirtualNode,
    overrides?: {
      anchor?: HostNode
      context?: MountContext
    },
  ): PatchResult<HostNode>
  /**
   * 用新节点替换旧节点：先卸载旧节点，再挂载新节点。
   */
  replace(
    previous: NormalizedVirtualNode,
    next: NormalizedVirtualNode,
    overrides?: {
      anchor?: HostNode
      context?: MountContext
    },
  ): PatchResult<HostNode>
  /** 仅卸载指定 `vnode`，不进行替换或重新挂载。 */
  unmountOnly(vnode: NormalizedVirtualNode): PatchResult<HostNode>
  /**
   * 将一组宿主节点移动到给定锚点之前，保持节点顺序。
   */
  moveNodesToAnchor(nodes: HostNode[], anchor?: HostNode): PatchResult<HostNode>
}

/**
 * 统一封装新增/替换/卸载/移动的宿主操作，便于 children diff 与 `patchChild` 复用。
 */
export function createPatchDriver<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  environment: PatchChildrenEnvironment<HostNode, HostElement, HostFragment>,
): PatchDriver<HostNode, HostElement, HostFragment> {
  const { container } = environment

  return {
    container,
    anchor: environment.anchor,
    context: environment.context,
    /** 在当前容器中挂载 `vnode`，允许覆盖锚点与上下文。 */
    mountNew(vnode, overrides) {
      const mounted = mountChildInEnvironment(options, vnode, {
        container,
        anchor: overrides?.anchor ?? environment.anchor,
        context: overrides?.context ?? environment.context,
      })

      return {
        ok: mounted?.ok,
        usedAnchor: overrides?.anchor ?? environment.anchor,
      }
    },
    /** 先卸载旧节点再挂载新节点，保持调用方逻辑简单。 */
    replace(previous, next, overrides) {
      unmount(options, previous)

      return this.mountNew(next, overrides)
    },
    /** 卸载节点但不触发重新挂载，供删除场景使用。 */
    unmountOnly(vnode) {
      unmount(options, vnode)

      return {
        ok: true,
      }
    },
    /**
     * 将节点序列搬移到锚点位置：
     * - 无锚点时视为无需移动。
     * - 有锚点时按原顺序插入，保持兄弟顺序不变。
     */
    moveNodesToAnchor(nodes, anchor = environment.anchor) {
      if (!anchor) {
        return {
          ok: true,
          moved: false,
          usedAnchor: anchor,
        }
      }

      moveNodes(options, nodes, container, anchor)

      return {
        ok: true,
        moved: true,
        usedAnchor: anchor,
      }
    },
  }
}
