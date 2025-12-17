import type { ComponentInstance } from './component/context.ts'
import type { MountedHandle } from './mount/handle.ts'
import type { SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface RuntimeVNode<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> extends VirtualNode {
  el?: HostNode
  anchor?: HostNode
  component?: ComponentInstance<HostNode, HostElement, HostFragment, SetupComponent>
  handle?: MountedHandle<HostNode>
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function asRuntimeVNode<
  HostNode,
  HostElement extends HostNode & WeakKey = HostNode & WeakKey,
  HostFragment extends HostNode = HostNode,
>(virtualNode: VirtualNode): RuntimeVNode<HostNode, HostElement, HostFragment> {
  return virtualNode as RuntimeVNode<HostNode, HostElement, HostFragment>
}
