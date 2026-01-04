/**
 * `KeepAlive` 上下文工厂：初始化缓存容器与宿主能力。
 */
import type { RendererOptions } from '../../renderer.ts'
import type { KeepAliveContext } from './context-types.ts'

/**
 * 创建 `KeepAlive` 上下文，初始化缓存容器与宿主能力。
 *
 * @param options - 宿主渲染能力集合
 * @returns 新的上下文实例
 */
export function createKeepAliveContext<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): KeepAliveContext<HostNode, HostElement, HostFragment> {
  return {
    rendererOptions: options,
    /* 使用离屏容器承载失活子树，避免污染实际渲染树结构。 */
    storageContainer: options.createElement('div'),
    cache: new Map(),
    keys: new Set(),
  }
}
