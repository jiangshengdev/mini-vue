/**
 * `patch` 阶段的挂载桥接：在既有环境下执行 `mountChild` 并直接插入。
 */
import type { ChildEnvironment } from '../environment.ts'
import type { MountedHandle } from '../mount/handle.ts'
import { mountChild } from '../mount/index.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'

/**
 * 在已知容器/锚点/上下文的前提下挂载单个 `virtualNode`，并直接插入到目标位置。
 *
 * @remarks
 * - 该函数是 `patch` 阶段复用 `mount` 能力的桥接层。
 * - 传入 `undefined` 时直接返回 `undefined`，不产生任何节点。
 */
export function mountChildInEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  virtualNode: NormalizedVirtualNode | undefined,
  environment: ChildEnvironment<HostNode, HostElement, HostFragment>,
): MountedHandle<HostNode> | undefined {
  if (!virtualNode) {
    return undefined
  }

  return mountChild(options, virtualNode, environment)
}
