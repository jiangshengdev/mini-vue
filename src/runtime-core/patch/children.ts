/**
 * `children` diff 入口：根据是否存在 `key` 选择 keyed 或 unkeyed 策略。
 */
import type { NormalizedChildren } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { PatchChildrenEnvironment } from './children-environment.ts'
import { patchKeyedChildren } from './keyed-children.ts'
import { patchUnkeyedChildren } from './unkeyed-children.ts'
import { hasKeys } from './utils.ts'

/**
 * `patch` 一组 `children`：
 * - 若存在 `key`（任一侧有 `key`），走 `keyed diff` 以支持移动与复用。
 * - 否则按索引对齐的 `unkeyed diff`，逻辑更简单。
 *
 * @remarks
 * - `keyed diff` 允许跨索引复用与移动，适用于列表项有稳定标识的场景。
 * - `unkeyed diff` 只按索引对齐，不支持「同节点换位置」的语义，适用于简单列表。
 *
 * @param options - 宿主渲染原语集合
 * @param previousChildren - 旧子节点列表
 * @param nextChildren - 新子节点列表
 * @param environment - 容器、锚点与上下文以及单节点 `patch` 回调
 */
export function patchChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previousChildren: NormalizedChildren,
  nextChildren: NormalizedChildren,
  environment: PatchChildrenEnvironment<HostNode, HostElement, HostFragment>,
): void {
  /*
   * 只要任一侧出现 `key`，就必须走 `keyed diff`：
   * - `keyed diff` 允许跨索引复用与移动。
   * - `unkeyed diff` 只按索引对齐，不支持「同节点换位置」的语义。
   */
  const isKeyed = hasKeys(nextChildren) || hasKeys(previousChildren)

  if (isKeyed) {
    patchKeyedChildren(options, previousChildren, nextChildren, environment)

    return
  }

  patchUnkeyedChildren(options, previousChildren, nextChildren, environment)
}
