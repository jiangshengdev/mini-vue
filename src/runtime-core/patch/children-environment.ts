import type { ChildEnvironment, MountContext } from '../environment.ts'
import { deriveChildContext } from '../environment.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { PatchResult } from './types.ts'

/**
 * 子节点 `patch` 回调签名：由 `patchChildren` 调用，用于复用单节点的 `mount`/`patch`/`unmount` 逻辑。
 */
export type PatchChildFunction<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> = (
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previous: NormalizedVirtualNode | undefined,
  next: NormalizedVirtualNode | undefined,
  environment: PatchEnvironment<HostNode, HostElement, HostFragment>,
) => PatchResult<HostNode> | void

/**
 * 单个子节点 `patch` 所需的环境信息。
 */
export type PatchEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> = ChildEnvironment<HostNode, HostElement, HostFragment>

/**
 * `patchChildren` 的调用环境：在 `PatchEnvironment` 基础上追加 `patchChild` 回调。
 */
export interface PatchChildrenEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> extends PatchEnvironment<HostNode, HostElement, HostFragment> {
  /** 单节点 `patch` 实现（由调用方提供，常见为 `patchChild`）。 */
  patchChild: PatchChildFunction<HostNode, HostElement, HostFragment>
}

/**
 * 基于父环境为当前子节点派生环境：
 * - 根据位置计算 `shouldUseAnchor`，用于同级批量插入的锚点策略。
 */
export function createChildEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  environment: PatchChildrenEnvironment<HostNode, HostElement, HostFragment>,
  index: number,
  length: number,
): PatchEnvironment<HostNode, HostElement, HostFragment> & { context: MountContext } {
  return {
    container: environment.container,
    anchor: environment.anchor,
    context: deriveChildContext(environment.context, index, length),
  }
}
