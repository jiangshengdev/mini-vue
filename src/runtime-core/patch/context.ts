import type { UnknownComponentInstance } from '../component/context.ts'
import type { AppContext } from '../create-app.ts'
import type { MountContext } from '../mount/context.ts'

/**
 * `patch` 阶段可接受的宿主容器类型，兼容元素与片段。
 */
export type ContainerLike<HostNode, HostElement extends HostNode, HostFragment extends HostNode> =
  | HostElement
  | HostFragment

/**
 * `patch` 阶段传递的上下文信息：保留父组件与 app 上下文。
 */
export interface PatchContext {
  /** 当前处理节点所属的父组件实例，用于 provide/inject 链。 */
  parent?: UnknownComponentInstance
  /** 根级应用上下文（来自 createApp），用于传递 provides。 */
  appContext?: AppContext
}

/** 将 patch 上下文规整为 mount 阶段所需的结构。 */
export function normalizeMountContext(context?: PatchContext | MountContext): MountContext {
  return {
    parent: context?.parent,
    appContext: context?.appContext,
    /* 单节点 patch 的 mount 不需要依赖兄弟锚点策略，默认关闭 shouldUseAnchor。 */
    shouldUseAnchor: false,
  }
}

/**
 * 根据子节点位置补充 shouldUseAnchor，用于在同级批量插入时决定锚点策略。
 */
export function normalizeChildContext(
  context: PatchContext | MountContext | undefined,
  index: number,
  total: number,
): MountContext {
  return {
    parent: context?.parent,
    appContext: context?.appContext,
    /*
     * Children patch 中，若当前节点后面仍有兄弟节点，则后续插入/移动需要锚点保证相对顺序。
     * 最后一个节点不需要 anchor（它天然落在末尾）。
     */
    shouldUseAnchor: index < total - 1,
  }
}
