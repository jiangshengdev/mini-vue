/**
 * 构建 children diff 期间使用的宿主操作驱动，统一封装新增、卸载与移动。
 */
import type { ContainerLike, MountContext } from '../environment.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { PatchChildrenEnvironment } from './children-environment.ts'
import { mountChildInEnvironment } from './insertion.ts'
import type { PatchResult } from './types.ts'
import { move, unmount } from './utils.ts'

/**
 * `children diff` 期间的宿主驱动，统一封装新增/替换/卸载/移动操作。
 *
 * @remarks
 * - 提供统一的宿主操作接口，便于 `keyed`/`unkeyed` diff 复用。
 * - 所有操作都基于当前容器与锚点，保持插入位置一致性。
 */
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
   * 在容器中挂载全新的 `virtualNode`，可按需覆盖锚点与上下文。
   */
  mountNew(
    virtualNode: NormalizedVirtualNode,
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
  /** 仅卸载指定 `virtualNode`，不进行替换或重新挂载。 */
  unmountOnly(virtualNode: NormalizedVirtualNode): PatchResult<HostNode>
  /**
   * 将 `virtualNode` 对应的宿主范围移动到给定锚点之前。
   *
   * @remarks
   * - 对齐 Vue3：移动以 `vnode` 为单位，而不是依赖 `handle.nodes` 的快照数组。
   */
  moveToAnchor(virtualNode: NormalizedVirtualNode, anchor?: HostNode): PatchResult<HostNode>
}

/**
 * 统一封装新增/替换/卸载/移动的宿主操作，便于 `children diff` 与 `patchChild` 复用。
 *
 * @remarks
 * - 所有操作都基于传入的 `environment`，保持容器/锚点/上下文一致。
 * - 返回的 `PatchDriver` 对象提供声明式的宿主操作接口。
 *
 * @param options - 宿主渲染原语集合
 * @param environment - 当前 `patch children` 的容器、锚点与上下文
 * @returns 封装宿主操作的驱动对象
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
    /**
     * 在当前容器中挂载 `virtualNode`，允许覆盖锚点与上下文。
     *
     * @param virtualNode - 待挂载的节点
     * @param overrides - 可选的锚点与上下文覆盖
     * @returns 挂载结果与使用的锚点
     */
    mountNew(virtualNode, overrides) {
      const mounted = mountChildInEnvironment(options, virtualNode, {
        container,
        anchor: overrides?.anchor ?? environment.anchor,
        context: overrides?.context ?? environment.context,
      })

      return {
        ok: mounted?.ok,
        usedAnchor: overrides?.anchor ?? environment.anchor,
      }
    },
    /**
     * 先卸载旧节点再挂载新节点，保持调用方逻辑简单。
     *
     * @param previous - 需要替换的旧节点
     * @param next - 新节点
     * @param overrides - 可选的锚点与上下文覆盖
     * @returns 替换后的结果
     */
    replace(previous, next, overrides) {
      unmount(options, previous)

      return this.mountNew(next, overrides)
    },
    /**
     * 卸载节点但不触发重新挂载，供删除场景使用。
     *
     * @param virtualNode - 待卸载的节点
     * @returns 卸载结果
     */
    unmountOnly(virtualNode) {
      unmount(options, virtualNode)

      return {
        ok: true,
      }
    },
    /**
     * 将 `virtualNode` 对应的宿主范围搬移到锚点位置：
     * - 无锚点时追加到容器末尾。
     * - 有锚点时插入到锚点之前。
     *
     * @param virtualNode - 需要移动的节点
     * @param anchor - 目标锚点，默认为环境锚点
     * @returns 搬移结果
     */
    moveToAnchor(virtualNode, anchor = environment.anchor) {
      move(options, virtualNode, container, anchor)

      return {
        ok: true,
        moved: true,
        usedAnchor: anchor,
      }
    },
  }
}
