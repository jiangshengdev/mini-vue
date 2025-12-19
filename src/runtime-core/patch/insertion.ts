import type { ChildEnvironment } from '../environment.ts'
import type { MountedHandle } from '../mount/handle.ts'
import { mountChild } from '../mount/index.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'

export type InsertionEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> = ChildEnvironment<HostNode, HostElement, HostFragment>

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

  return mountChild(options, vnode, environment)
}
