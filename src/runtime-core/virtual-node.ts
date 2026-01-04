/**
 * 为 `virtualNode` 提供运行时增强形态，存储挂载与组件实例元信息。
 */
import type { ComponentInstance } from './component/context.ts'
import type { KeepAliveCacheKey, KeepAliveContext } from './components/keep-alive/context-types.ts'
import type { MountedHandle } from './mount/handle.ts'
import type { SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'

/**
 * 运行时附加元信息的 `virtualNode`，便于挂载与 `diff` 阶段复用宿主节点。
 *
 * @remarks
 * - `mount` 阶段会将宿主节点引用写入 `el`/`anchor`/`handle`。
 * - `patch` 阶段通过 `syncRuntimeMetadata` 将这些引用从旧 `virtualNode` 继承到新 `virtualNode`。
 * - 组件 `virtualNode` 额外持有 `component` 实例引用，用于驱动 `effect` 更新与卸载。
 */
export interface RuntimeVirtualNode<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> extends VirtualNode {
  /** 对应宿主节点引用：元素为自身，组件为子树根节点，`Fragment` 为首节点。 */
  el?: HostNode
  /** `Fragment` 或组件的尾锚点，用于批量插入/移动时定位区间末尾。 */
  anchor?: HostNode
  /** 若为组件 `virtualNode`，指向其组件实例，便于后续更新与卸载。 */
  component?: ComponentInstance<HostNode, HostElement, HostFragment, SetupComponent>
  /** 当前 `virtualNode` 的挂载句柄，封装节点集合与 `teardown` 能力。 */
  handle?: MountedHandle<HostNode>
  /** 当前组件是否应被 `KeepAlive` 缓存并在卸载时走 `deactivate`。 */
  shouldKeepAlive?: boolean
  /** 当前组件是否来自 `KeepAlive` 缓存（被激活的状态）。 */
  keptAlive?: boolean
  /** `KeepAlive` 实例上下文，用于激活/失活与缓存管理。 */
  keepAliveInstance?: KeepAliveContext<HostNode, HostElement, HostFragment>
  /** `KeepAlive` 使用的缓存 key。 */
  keepAliveCacheKey?: KeepAliveCacheKey
}

/**
 * 将普通 `virtualNode` 断言为运行时增强形态，供挂载路径写入元信息。
 *
 * @remarks
 * 该函数仅做类型断言，不进行运行时校验；调用方需确保 `virtualNode` 来自合法的渲染流程。
 *
 * @param virtualNode - 需要写入运行时元信息的虚拟节点
 * @returns 增强后的运行时虚拟节点
 */
export function asRuntimeVirtualNode<
  HostNode,
  HostElement extends HostNode & WeakKey = HostNode & WeakKey,
  HostFragment extends HostNode = HostNode,
>(virtualNode: VirtualNode): RuntimeVirtualNode<HostNode, HostElement, HostFragment> {
  return virtualNode as RuntimeVirtualNode<HostNode, HostElement, HostFragment>
}
