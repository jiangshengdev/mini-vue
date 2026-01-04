/**
 * KeepAlive 缓存容器实现：写入、LRU 更新与清理策略。
 */
import type { RuntimeNormalizedVirtualNode } from '../../patch/runtime-virtual-node.ts'
import { unmount as unmountVirtualNode } from '../../patch/utils.ts'
import type { KeepAliveCacheKey, KeepAliveContext } from './context-types.ts'
import { getComponentName } from './utils.ts'
import type { SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'

/**
 * 更新 LRU 顺序，将指定 key 标记为最新使用。
 *
 * @param keys - 当前 key 集合
 * @param key - 需要提升的 key
 */
export function refreshKeyOrder(keys: Set<KeepAliveCacheKey>, key: KeepAliveCacheKey): void {
  keys.delete(key)
  keys.add(key)
}

/**
 * 写入缓存并维护 LRU 顺序，必要时触发淘汰。
 *
 * @param context - 缓存上下文
 * @param key - 缓存 key
 * @param vnode - 运行时虚拟节点
 */
export function setCacheEntry<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  context: KeepAliveContext<HostNode, HostElement, HostFragment>,
  key: KeepAliveCacheKey,
  vnode: RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>,
): void {
  context.cache.set(key, { vnode })
  refreshKeyOrder(context.keys, key)

  if (context.max !== undefined && context.cache.size > context.max) {
    const oldestKey = context.keys.values().next().value

    if (oldestKey !== undefined && oldestKey !== key) {
      pruneCacheEntry(context, oldestKey)
    }
  }
}

/**
 * 按过滤规则遍历缓存并清理不再需要的条目。
 *
 * @param context - 缓存上下文
 * @param filter - 返回 `true` 表示保留
 */
export function pruneCache<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  context: KeepAliveContext<HostNode, HostElement, HostFragment>,
  filter: (name: string | undefined) => boolean,
): void {
  for (const [key, entry] of context.cache.entries()) {
    const name = getComponentName(entry.vnode as unknown as VirtualNode<SetupComponent>)

    if (!filter(name)) {
      pruneCacheEntry(context, key)
    }
  }
}

/**
 * 移除单个缓存条目并触发卸载。
 *
 * @param context - 缓存上下文
 * @param key - 需要移除的缓存 key
 */
export function pruneCacheEntry<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(context: KeepAliveContext<HostNode, HostElement, HostFragment>, key: KeepAliveCacheKey): void {
  const cached = context.cache.get(key)

  if (!cached) {
    return
  }

  cached.vnode.shouldKeepAlive = false
  cached.vnode.keepAliveInstance = undefined
  cached.vnode.keepAliveCacheKey = undefined
  cached.vnode.keptAlive = undefined
  unmountVirtualNode(context.rendererOptions, cached.vnode)
  context.cache.delete(key)
  context.keys.delete(key)
}

/**
 * 解析最大缓存数量，非正数或无效值视为无限制。
 *
 * @param max - 用户传入的最大值
 * @returns 规范化后的数量或 `undefined`
 */
export function resolveMax(max: number | undefined): number | undefined {
  if (max === undefined) {
    return undefined
  }

  const normalized = Number(max)

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return undefined
  }

  return Math.trunc(normalized)
}
