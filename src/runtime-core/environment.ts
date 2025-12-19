import type { UnknownComponentInstance } from './component/context.ts'
import type { AppContext } from './create-app.ts'

/** 挂载与 patch 共享的上下文信息。 */
export interface MountContext {
  /** 当前子树是否需要锚点以保持兄弟顺序。 */
  shouldUseAnchor?: boolean
  /** 当前挂载/更新发生在哪个父组件实例下。 */
  parent?: UnknownComponentInstance
  /** 当前挂载所属的应用上下文，用于 root `provides` 的稳定传播。 */
  appContext?: AppContext
}

/** Patch 阶段可接受的宿主容器类型，兼容元素与片段。 */
export type ContainerLike<HostNode, HostElement extends HostNode, HostFragment extends HostNode> =
  | HostElement
  | HostFragment

/**
 * 单个子节点 mount/patch 所需的环境信息。
 *
 * @remarks
 * 统一封装容器/锚点/上下文，避免在 mount 与 patch 之间重复包装。
 */
export interface ChildEnvironment<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  /** 子节点将被插入的宿主容器（元素或片段）。 */
  container: ContainerLike<HostNode, HostElement, HostFragment>
  /** 插入锚点：用于将新挂载/移动的节点放到正确位置。 */
  anchor?: HostNode
  /** 父组件与 `appContext` 等上下文，向下透传到 `mount`/`patch`。 */
  context?: MountContext
}

/**
 * 根据子节点位置补充 `shouldUseAnchor`，用于在同级批量插入时决定锚点策略。
 */
export function deriveChildContext(
  context: MountContext | undefined,
  index: number,
  total: number,
): MountContext {
  return {
    parent: context?.parent,
    appContext: context?.appContext,
    /*
     * `children patch` 中，若当前节点后面仍有兄弟节点，则后续插入/移动需要锚点保证相对顺序。
     * 最后一个节点不需要 `anchor`（它天然落在末尾）。
     */
    shouldUseAnchor: index < total - 1,
  }
}
