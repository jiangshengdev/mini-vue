/**
 * `KeepAlive` 的缓存上下文定义，集中描述缓存记录与宿主存储容器。
 * 为组件渲染管线提供最小依赖面，避免缓存实现泄漏到渲染逻辑。
 * 仅承载数据结构，不处理具体的激活/失活策略。
 */
import type { RuntimeNormalizedVirtualNode } from '../patch/runtime-virtual-node.ts'
import type { RendererOptions } from '../renderer.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'

/** `KeepAlive` 缓存使用的 key：优先使用 `vnode.key`，否则回退到组件类型本身。 */
export type KeepAliveCacheKey = PropertyKey | SetupComponent

/** `KeepAlive` 缓存条目，记录被缓存的运行时虚拟节点。 */
export interface KeepAliveCacheEntry<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  /** 已挂载的运行时虚拟节点，用于后续激活或卸载。 */
  vnode: RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>
}

/** `KeepAlive` 实例级上下文，维护缓存、存储容器与宿主能力。 */
export interface KeepAliveContext<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  /** 宿主渲染能力，提供创建元素与移动节点的 API。 */
  rendererOptions: RendererOptions<HostNode, HostElement, HostFragment>
  /** 缓存存储容器，暂存失活子树。 */
  storageContainer: HostElement
  /** 按 key 存储的缓存条目，保存子组件的运行时节点。 */
  cache: Map<KeepAliveCacheKey, KeepAliveCacheEntry<HostNode, HostElement, HostFragment>>
  /** 记录 key 使用顺序，支持 `max` 限制时的淘汰。 */
  keys: Set<KeepAliveCacheKey>
  /** 最大缓存数量，未设置时无限制。 */
  max?: number
}
