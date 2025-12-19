import type { MountContext } from '../mount/context.ts'
import type { MountedHandle } from '../mount/handle.ts'
import { mountChild } from '../mount/index.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { ContainerLike, PatchContext } from './context.ts'
import { normalizeMountContext } from './context.ts'

export interface InsertionEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  container: ContainerLike<HostNode, HostElement, HostFragment>
  anchor?: HostNode
  context?: PatchContext | MountContext
}

/**
 * 在已知容器/锚点/上下文的前提下挂载单个 vnode，并直接插入到目标位置。
 */
export function mountAndInsert<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  vnode: NormalizedVirtualNode | undefined,
  environment: InsertionEnvironment<HostNode, HostElement, HostFragment>,
): MountedHandle<HostNode> | undefined {
  if (!vnode) {
    return undefined
  }

  return mountChild(
    options,
    vnode,
    environment.container,
    normalizeMountContext(environment.context),
    environment.anchor,
  )
}
