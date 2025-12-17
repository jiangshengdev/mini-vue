/**
 * 运行时 VNode 结构，携带宿主节点引用，供 patch 复用。
 */
import type { UnknownComponentInstance } from './component/context.ts'
import type { MountedHandle } from './mount/handle.ts'
import type { ElementType, VirtualNode, VirtualNodeChild } from '@/jsx-foundation/index.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * runtime-core 内部扩展的 VNode 结构，携带宿主节点引用。
 *
 * @remarks
 * - VirtualNode 保持平台无关、无宿主引用，JSX 产物直接使用。
 * - RuntimeVNode 仅在 runtime-core 内部使用，记录 mount 后的宿主节点映射。
 * - 通过 WeakMap 维护 VirtualNode 到 RuntimeVNode 的关联。
 */
export interface RuntimeVNode<HostNode = unknown, HostElement = unknown> {
  /** 原始 VNode 的类型（标签名、组件函数或 Fragment）。 */
  readonly type: ElementType
  /** 节点携带的属性对象。 */
  readonly props?: PropsShape
  /** 归一化后的子节点列表。 */
  readonly children: VirtualNodeChild[]
  /** 可选的 diff key，用于稳定节点身份。 */
  readonly key?: PropertyKey

  /** Text/Element 挂载后的宿主节点引用。 */
  el?: HostNode | HostElement
  /** Fragment/数组的结束锚点。 */
  anchor?: HostNode
  /** 组件实例引用（仅组件节点有值）。 */
  component?: UnknownComponentInstance
  /** 当前节点的挂载句柄，用于 teardown。 */
  mountedHandle?: MountedHandle<HostNode>
}

/**
 * 渲染输出的运行时形式，可能是 RuntimeVNode、原始值或数组。
 */
export type RuntimeRenderOutput<HostNode = unknown, HostElement = unknown> =
  | RuntimeVNode<HostNode, HostElement>
  | string
  | number
  | boolean
  | undefined
  | RuntimeRenderOutput<HostNode, HostElement>[]

/** VirtualNode 到 RuntimeVNode 的映射缓存。 */
const vnodeMap = new WeakMap<VirtualNode, RuntimeVNode>()

/**
 * 获取或创建 VirtualNode 对应的 RuntimeVNode。
 */
export function getOrCreateRuntimeVNode<HostNode, HostElement>(
  vnode: VirtualNode,
): RuntimeVNode<HostNode, HostElement> {
  let runtime = vnodeMap.get(vnode) as RuntimeVNode<HostNode, HostElement> | undefined

  if (!runtime) {
    runtime = {
      type: vnode.type,
      props: vnode.props,
      children: vnode.children,
      key: vnode.key,
    }
    vnodeMap.set(vnode, runtime)
  }

  return runtime
}

/**
 * 获取 VirtualNode 对应的 RuntimeVNode（若已创建）。
 */
export function getRuntimeVNode<HostNode, HostElement>(
  vnode: VirtualNode,
): RuntimeVNode<HostNode, HostElement> | undefined {
  return vnodeMap.get(vnode) as RuntimeVNode<HostNode, HostElement> | undefined
}

/**
 * 为 RuntimeVNode 设置宿主元素引用。
 */
export function setRuntimeVNodeEl<HostNode, HostElement>(
  runtime: RuntimeVNode<HostNode, HostElement>,
  el: HostNode | HostElement,
): void {
  runtime.el = el
}

/**
 * 为 RuntimeVNode 设置结束锚点。
 */
export function setRuntimeVNodeAnchor<HostNode, HostElement>(
  runtime: RuntimeVNode<HostNode, HostElement>,
  anchor: HostNode,
): void {
  runtime.anchor = anchor
}

/**
 * 为 RuntimeVNode 设置组件实例引用。
 */
export function setRuntimeVNodeComponent<HostNode, HostElement>(
  runtime: RuntimeVNode<HostNode, HostElement>,
  component: UnknownComponentInstance,
): void {
  runtime.component = component
}

/**
 * 为 RuntimeVNode 设置挂载句柄。
 */
export function setRuntimeVNodeMountedHandle<HostNode>(
  runtime: RuntimeVNode<HostNode>,
  handle: MountedHandle<HostNode>,
): void {
  runtime.mountedHandle = handle
}
