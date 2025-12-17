import type { ComponentInstance } from '../component/context.ts'
import type { MountContext } from '../mount/context.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'

export type ContainerLike<HostNode, HostElement extends HostNode, HostFragment extends HostNode> =
  | HostElement
  | HostFragment

export interface PatchContext {
  parent?: ComponentInstance<unknown, WeakKey, unknown, SetupComponent>
  appContext?: unknown
}

export function normalizeMountContext(context?: PatchContext): MountContext {
  return {
    parent: context?.parent,
    appContext: context?.appContext as never,
    shouldUseAnchor: false,
  }
}

export function normalizeChildContext(
  context: PatchContext | undefined,
  index: number,
  total: number,
): MountContext {
  return {
    parent: context?.parent,
    appContext: context?.appContext as never,
    shouldUseAnchor: index < total - 1,
  }
}
