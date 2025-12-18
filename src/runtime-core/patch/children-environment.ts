import type { MountContext } from '../mount/context.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { ContainerLike, PatchContext } from './context.ts'
import { normalizeChildContext } from './context.ts'

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
) => void

/**
 * 单个子节点 `patch` 所需的环境信息。
 */
interface BasePatchEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  /** 子节点将被插入的宿主容器（元素或片段）。 */
  container: ContainerLike<HostNode, HostElement, HostFragment>
  /** 插入锚点：用于将新挂载/移动的节点放到正确位置。 */
  anchor?: HostNode
  /** 父组件与 `appContext` 等上下文，向下透传到 `mount`/`patch`。 */
  context?: PatchContext | MountContext
}

/**
 * 单个子节点 `patch` 所需的环境信息。
 */
export type PatchEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> = BasePatchEnvironment<HostNode, HostElement, HostFragment>

/**
 * `patchChildren` 的调用环境：在 `PatchEnvironment` 基础上追加 `patchChild` 回调。
 */
export interface PatchChildrenContext<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> extends PatchEnvironment<HostNode, HostElement, HostFragment> {
  /** 单节点 `patch` 实现（由调用方提供，常见为 `patchChild`）。 */
  patchChild: PatchChildFunction<HostNode, HostElement, HostFragment>
}

/**
 * 基于父环境为当前子节点派生环境：
 * - 通过 `normalizeChildContext` 计算 `shouldUseAnchor`，用于同级批量插入的锚点策略。
 */
export function createChildEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  environment: PatchChildrenContext<HostNode, HostElement, HostFragment>,
  index: number,
  length: number,
): PatchEnvironment<HostNode, HostElement, HostFragment> & {
  context: ReturnType<typeof normalizeChildContext>
} {
  return {
    container: environment.container,
    anchor: environment.anchor,
    context: normalizeChildContext(environment.context, index, length),
  }
}
