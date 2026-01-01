import type { RuntimeNormalizedVirtualNode } from '../patch/runtime-virtual-node.ts'
import type { RendererOptions } from '../renderer.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'

/** `KeepAlive` 缓存使用的 key：优先使用 `vnode.key`，否则回退到组件类型本身。 */
export type KeepAliveCacheKey = PropertyKey | SetupComponent

export interface KeepAliveCacheEntry<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  vnode: RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>
}

/** `KeepAlive` 实例级上下文，维护缓存、存储容器与宿主能力。 */
export interface KeepAliveContext<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  rendererOptions: RendererOptions<HostNode, HostElement, HostFragment>
  storageContainer: HostElement
  cache: Map<KeepAliveCacheKey, KeepAliveCacheEntry<HostNode, HostElement, HostFragment>>
  keys: Set<KeepAliveCacheKey>
  max?: number
}
