/**
 * `virtualNode` 分派入口：根据类型走组件、元素或 `Fragment` 的挂载路径。
 *
 * - 只负责分派与 runtime 元数据回写，不处理具体渲染细节。
 * - 保持与组件/元素挂载路径的锚点语义一致，方便后续 patch 对齐。
 */
import { mountComponent } from '../component/index.ts'
import { setDevtoolsNodeMarkers } from '../devtools/node-markers.ts'
import type { ChildEnvironment } from '../environment.ts'
import type { RendererOptions } from '../index.ts'
import { asRuntimeVirtualNode } from '../virtual-node.ts'
import { mountChild } from './child.ts'
import { mountElement } from './element.ts'
import type { MountedHandle } from './handle.ts'
import type { SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'
import { Fragment } from '@/jsx-foundation/index.ts'

/**
 * 将通用 `virtualNode` 分派给组件或元素挂载路径。
 *
 * @remarks
 * 分派策略：
 * - `Fragment`：直接展开自身 `children`，不走组件路径。
 * - 函数组件：通过 `mountComponent` 执行并挂载其返回值。
 * - 普通标签名：走元素挂载逻辑（`mountElement`）。
 *
 * @param options - 宿主渲染器提供的创建、插入与移除操作
 * @param virtualNode - 即将挂载的通用 `virtualNode`
 * @param environment - 当前挂载上下文，包含容器、锚点与上下文
 * @returns 描述已插入宿主节点与卸载能力的句柄，可能为空表示无节点
 */
export function mountVirtualNode<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  virtualNode: VirtualNode,
  environment: ChildEnvironment<HostNode, HostElement, HostFragment>,
): MountedHandle<HostNode> | undefined {
  const parent = environment.context?.parent

  /* `Fragment` 直接展开自身 `children`，不走组件路径。 */
  if (virtualNode.type === Fragment) {
    const mounted = mountChild(options, virtualNode.children, environment)
    const runtime = asRuntimeVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)

    if (mounted) {
      runtime.el = mounted.nodes[0]
      runtime.anchor = mounted.nodes.at(-1)
      runtime.handle = mounted
      runtime.component = undefined

      setDevtoolsNodeMarkers({ node: runtime.el, vnode: virtualNode, parent })

      if (runtime.anchor && runtime.anchor !== runtime.el) {
        setDevtoolsNodeMarkers({ node: runtime.anchor, vnode: virtualNode, parent })
      }
    }

    return mounted
  }

  /* 函数组件通过 `mountComponent` 执行并挂载其返回值。 */
  if (typeof virtualNode.type === 'function') {
    const mounted = mountComponent(options, virtualNode as VirtualNode<SetupComponent>, environment)

    const runtime = asRuntimeVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)

    if (mounted) {
      runtime.handle = mounted
      runtime.el = mounted.nodes[0]
      runtime.anchor = mounted.nodes.at(-1)
    }

    return mounted
  }

  /* 普通标签名直接走元素挂载逻辑。 */
  const mounted = mountElement(options, virtualNode as VirtualNode<string>, environment)
  const runtime = asRuntimeVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)

  runtime.el = mounted.nodes[0]
  runtime.anchor = undefined
  runtime.handle = mounted
  runtime.component = undefined

  setDevtoolsNodeMarkers({ node: runtime.el, vnode: virtualNode, parent })

  return mounted
}
