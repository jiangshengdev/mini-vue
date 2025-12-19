import type { ContainerLike, MountContext } from '../environment.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { PatchChildrenContext } from './children-environment.ts'
import { mountAndInsert } from './insertion.ts'
import type { PatchResult } from './types.ts'
import { moveNodes, unmount } from './utils.ts'

export interface PatchDriver<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  readonly container: ContainerLike<HostNode, HostElement, HostFragment>
  readonly anchor?: HostNode
  readonly context?: MountContext
  mountNew(
    vnode: NormalizedVirtualNode,
    overrides?: {
      anchor?: HostNode
      context?: MountContext
    },
  ): PatchResult<HostNode>
  replace(
    previous: NormalizedVirtualNode,
    next: NormalizedVirtualNode,
    overrides?: {
      anchor?: HostNode
      context?: MountContext
    },
  ): PatchResult<HostNode>
  unmountOnly(vnode: NormalizedVirtualNode): PatchResult<HostNode>
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
  environment: PatchChildrenContext<HostNode, HostElement, HostFragment>,
): PatchDriver<HostNode, HostElement, HostFragment> {
  const { container } = environment

  return {
    container,
    anchor: environment.anchor,
    context: environment.context,
    mountNew(vnode, overrides) {
      const mounted = mountAndInsert(options, vnode, {
        container,
        anchor: overrides?.anchor ?? environment.anchor,
        context: overrides?.context ?? environment.context,
      })

      return {
        ok: mounted?.ok,
        usedAnchor: overrides?.anchor ?? environment.anchor,
      }
    },
    replace(previous, next, overrides) {
      unmount(options, previous)

      return this.mountNew(next, overrides)
    },
    unmountOnly(vnode) {
      unmount(options, vnode)

      return {
        ok: true,
      }
    },
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
