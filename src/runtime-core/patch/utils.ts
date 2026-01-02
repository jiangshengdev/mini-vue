/**
 * Patch 子域的通用工具：卸载、移动、宿主节点遍历与比较。
 */
import { deactivateKeepAlive } from '../components/keep-alive.tsx'
import type { NormalizedChildren, NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { RuntimeNormalizedVirtualNode } from './runtime-virtual-node.ts'
import { asRuntimeNormalizedVirtualNode } from './runtime-virtual-node.ts'
import { Fragment, Text } from '@/jsx-foundation/index.ts'

/**
 * 卸载一个已渲染的 `virtualNode`：
 * - 若存在 `mount` 阶段生成的 `handle`，则优先走 `handle.teardown()` 释放副作用与宿主节点。
 * - 否则退化为直接从宿主容器移除已记录的 `el`。
 *
 * @remarks
 * - `handle.teardown` 会统一处理组件 `effect`、事件清理、以及多节点/片段的宿主移除。
 * - 无 `handle` 的节点只记录了单一 `el`，直接移除即可。
 */
export function unmount<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  virtualNode: NormalizedVirtualNode,
): void {
  const runtime = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)
  const { handle } = runtime

  if (
    runtime.shouldKeepAlive &&
    runtime.keepAliveInstance &&
    typeof virtualNode.type === 'function' &&
    runtime.component
  ) {
    deactivateKeepAlive(options, runtime)

    return
  }

  if (handle) {
    /* `handle.teardown` 会统一处理组件 `effect`、事件清理、以及多节点/片段的宿主移除。 */
    handle.teardown()

    return
  }

  if (runtime.el) {
    /* 无 `handle` 的节点只记录了单一 `el`：这里直接移除即可。 */
    options.remove(runtime.el)
  }
}

/**
 * 获取 `virtualNode` 对应的首个宿主节点。
 *
 * @remarks
 * - Element/Text/Comment：直接返回 `runtime.el`。
 * - Fragment：返回片段起始锚点 `runtime.el`。
 * - Component：递归读取 `instance.subTree`（对齐 Vue3：组件范围来源于子树）。
 */
export function getFirstHostNode<
  HostNode,
  HostElement extends HostNode & WeakKey = HostNode & WeakKey,
  HostFragment extends HostNode = HostNode,
>(virtualNode: NormalizedVirtualNode): HostNode | undefined {
  const runtime = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)

  if (typeof virtualNode.type === 'function' && virtualNode.type !== Fragment) {
    const instance = runtime.component
    const subTree = instance?.subTree

    if (subTree) {
      return getFirstHostNode<HostNode, HostElement, HostFragment>(subTree)
    }
  }

  return runtime.el
}

/**
 * 获取 `virtualNode` 对应的最后一个宿主节点（区间尾部）。
 *
 * @remarks
 * - Element/Text/Comment：返回 `runtime.el`。
 * - Fragment：返回片段结束锚点 `runtime.anchor`。
 * - Component：递归读取 `instance.subTree`（对齐 Vue3：组件范围来源于子树）。
 */
export function getLastHostNode<
  HostNode,
  HostElement extends HostNode & WeakKey = HostNode & WeakKey,
  HostFragment extends HostNode = HostNode,
>(virtualNode: NormalizedVirtualNode): HostNode | undefined {
  const runtime = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)

  if (typeof virtualNode.type === 'function' && virtualNode.type !== Fragment) {
    const instance = runtime.component
    const subTree = instance?.subTree

    if (subTree) {
      const last = getLastHostNode<HostNode, HostElement, HostFragment>(subTree)

      if (last) {
        return last
      }
    }

    return runtime.anchor ?? runtime.el
  }

  if (virtualNode.type === Fragment) {
    return runtime.anchor ?? runtime.el
  }

  return runtime.el
}

/**
 * 获取 `virtualNode` 之后的下一个宿主节点（用于计算插入锚点）。
 *
 * @remarks
 * - Element/Text/Comment：返回 `hostNextSibling(el)`。
 * - Fragment：返回 `hostNextSibling(anchor)`（对齐 Vue3：以区间尾锚点作为边界）。
 * - Component：递归到 `instance.subTree`（对齐 Vue3：组件范围来源于子树）。
 */
export function getNextHostNode<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  virtualNode: NormalizedVirtualNode,
): HostNode | undefined {
  const runtime = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)

  if (typeof virtualNode.type === 'function' && virtualNode.type !== Fragment) {
    const instance = runtime.component
    const subTree = instance?.subTree

    if (subTree) {
      return getNextHostNode(options, subTree)
    }

    const tailNode = runtime.anchor ?? runtime.el

    return tailNode ? options.nextSibling(tailNode) : undefined
  }

  /* Fragment 的尾边界是 `anchor`：下一个宿主节点应从尾锚点的 nextSibling 获取。 */
  if (virtualNode.type === Fragment) {
    const endAnchor = runtime.anchor

    return endAnchor ? options.nextSibling(endAnchor) : undefined
  }

  return runtime.el ? options.nextSibling(runtime.el) : undefined
}

/**
 * 将 `virtualNode` 对应的宿主节点移动到指定容器/锚点之前。
 *
 * @remarks
 * - Element/Text/Comment：移动单个宿主节点。
 * - Fragment：通过 `nextSibling` 遍历 `[start..end]` 区间并整体搬移。
 * - Component：递归搬移 `instance.subTree`（对齐 Vue3：组件范围来源于子树）。
 */
export function move<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  virtualNode: NormalizedVirtualNode,
  container: HostElement | HostFragment,
  anchor?: HostNode,
): void {
  const runtime = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(virtualNode)

  const insert = (node: HostNode): void => {
    if (anchor) {
      options.insertBefore(container, node, anchor)
    } else {
      options.appendChild(container, node)
    }
  }

  const moveNodeRange = (start: HostNode, end: HostNode): void => {
    let current: HostNode | undefined = start

    while (current) {
      const next: HostNode | undefined = current === end ? undefined : options.nextSibling(current)

      insert(current)

      if (current === end) {
        break
      }

      current = next
    }
  }

  if (typeof virtualNode.type === 'function' && virtualNode.type !== Fragment) {
    const instance = runtime.component

    if (instance?.subTree) {
      move(options, instance.subTree, container, anchor)

      return
    }

    if (runtime.el) {
      insert(runtime.el)
    }

    return
  }

  if (virtualNode.type === Fragment) {
    const start = runtime.el
    const end = runtime.anchor ?? runtime.el

    if (start && end) {
      moveNodeRange(start, end)

      return
    }

    if (start) {
      insert(start)
    }

    return
  }

  if (runtime.el) {
    insert(runtime.el)
  }
}

/**
 * 判断两个 `virtualNode` 是否可视为「同一个节点」，用于决定走 `patch` 还是卸载重建。
 *
 * @remarks
 * - `Text` 节点在 `diff` 中只要都是 `Text` 且 `key` 相同即可复用宿主节点。
 * - 其它节点需同时满足 `type` 与 `key` 相同。
 * - 与 Vue 的 `isSameVNodeType` 语义对齐。
 */
export function isSameVirtualNode(
  a: NormalizedVirtualNode | undefined,
  b: NormalizedVirtualNode | undefined,
): boolean {
  if (!a || !b) {
    return false
  }

  if (a.type === Text && b.type === Text) {
    /* `Text` 节点也需要尊重 `key`：key 不同应视为不同节点。 */
    return a.key === b.key
  }

  return a.type === b.type && a.key === b.key
}

/**
 * 将一组宿主节点整体移动到指定锚点之前，保持节点内部顺序不变。
 */
export function moveNodes<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  nodes: HostNode[],
  container: HostElement | HostFragment,
  anchor: HostNode,
): void {
  /* `insertBefore` 会保持每个节点相对 `anchor` 的顺序，因此按原顺序逐个插入即可。 */
  for (const node of nodes) {
    options.insertBefore(container, node, anchor)
  }
}

/**
 * 从 `children` 的指定位置向后寻找「下一个可用锚点」。
 *
 * @remarks
 * - 使用 `vnode.el` 作为锚点来源：对齐 Vue3 的「宿主范围由 `el/anchor` 表达」策略。
 * - 找不到时返回 `fallback`（通常来自父级传入的 `anchor`）。
 * - 该函数用于 `keyed`/`unkeyed` diff 中确定新节点的插入位置。
 */
export function findNextAnchor<HostNode>(
  children: NormalizedChildren,
  startIndex: number,
  fallback: HostNode | undefined,
): HostNode | undefined {
  for (let index = startIndex; index < children.length; index += 1) {
    const firstNode = getFirstHostNode<HostNode>(children[index])

    if (firstNode) {
      /* 取该 `virtualNode` 对应的首个宿主节点，作为后续插入的稳定锚点。 */
      return firstNode
    }
  }

  return fallback
}

/**
 * 判断 `children` 是否包含 `key`，用于决定 `keyed`/`unkeyed` 两套 `diff` 策略。
 */
export function hasKeys(children: NormalizedChildren): boolean {
  return children.some((child) => {
    /* `key` 必须是「存在且非 `null`」：与 Vue 的 `key` 语义对齐，避免把 `null` 当成有效 `key`。 */
    return child.key !== undefined && child.key !== null
  })
}

/**
 * 在 `patch` 过程中同步 runtime 元数据，使「新 `virtualNode`」复用「旧 `virtualNode`」的宿主引用。
 *
 * @remarks
 * - `el`/`handle` 会在 `mount` 时写入，`patch` 时必须继承以避免重复创建/丢失 `teardown` 能力。
 * - `anchor`/`component` 允许按需覆盖：例如 `Text`/`Fragment` 分支会显式清空 `component`。
 * - 这是 `patch` 复用宿主节点的核心机制。
 */
export function syncRuntimeMetadata<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  runtimePrevious: RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>,
  runtimeNext: RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>,
  overrides?: {
    anchor?: HostNode | undefined
    component?: RuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>['component']
  },
): void {
  /*
   * `el`/`handle` 的继承是 `patch` 的基础：
   * - 没有继承就无法复用宿主节点。
   * - 没有继承 `handle` 就无法正确 `teardown`/`move`（尤其是 `Fragment`/组件多节点场景）。
   */
  runtimeNext.el = runtimePrevious.el
  runtimeNext.handle = runtimePrevious.handle

  /*
   * `anchor`/`component` 允许按节点类型局部覆盖：
   * - 例如 `Text`/元素节点不需要 `anchor`。
   * - 例如 `Fragment`/非组件节点需要清空 `component`。
   */
  runtimeNext.anchor =
    overrides && 'anchor' in overrides ? overrides.anchor : runtimePrevious.anchor
  runtimeNext.component =
    overrides && 'component' in overrides ? overrides.component : runtimePrevious.component
}
