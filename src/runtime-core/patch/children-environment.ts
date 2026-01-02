/**
 * 封装 `patch children` 阶段的环境与回调，避免循环依赖并稳定锚点信息。
 */
import type { ChildEnvironment, MountContext } from '../environment.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { PatchResult } from './types.ts'

/**
 * 子节点 `patch` 回调签名：由 `patchChildren` 调用，用于复用单节点的 `mount`/`patch`/`unmount` 逻辑。
 *
 * @remarks
 * 通过回调注入 `patchChild` 实现，避免 `child.ts`/`children.ts` 互相 `import` 造成循环依赖。
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
 *
 * @remarks
 * - `patchChild` 由调用方提供，常见为 `patchChild` 函数。
 * - 这种设计允许在不同场景下注入不同的单节点处理逻辑。
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
 * - 当前实现不再使用 `shouldUseAnchor` 这类位置推断开关。
 *
 * @remarks
 * - 插入位置完全由调用方显式传入的 `environment.anchor` 决定。
 * - 子节点的顺序保证由 `patchChildren`（keyed/unkeyed diff）计算锚点并按需传入。
 */
export function createChildEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  environment: PatchChildrenEnvironment<HostNode, HostElement, HostFragment>,
): PatchEnvironment<HostNode, HostElement, HostFragment> & { context?: MountContext } {
  return {
    container: environment.container,
    anchor: environment.anchor,
    context: environment.context,
  }
}
