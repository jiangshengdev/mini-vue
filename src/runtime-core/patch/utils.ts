import type { NormalizedChildren, NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { RuntimeNormalizedVirtualNode } from './runtime-vnode.ts'
import { asRuntimeNormalizedVirtualNode, getFirstHostNode } from './runtime-vnode.ts'
import { Text } from '@/jsx-foundation/index.ts'

/**
 * 卸载一个已渲染的 `vnode`：
 * - 若存在 `mount` 阶段生成的 `handle`，则优先走 `handle.teardown()` 释放副作用与宿主节点。
 * - 否则退化为直接从宿主容器移除已记录的 `el`。
 */
export function unmount<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  vnode: NormalizedVirtualNode,
): void {
  const runtime = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(vnode)
  const { handle } = runtime

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
 * 判断两个 `vnode` 是否可视为“同一个节点”，用于决定走 `patch` 还是卸载重建。
 *
 * @remarks
 * - `Text` 节点在 `diff` 中只要都是 `Text` 即可复用宿主节点。
 * - 其它节点需同时满足 `type` 与 `key` 相同。
 */
export function isSameVirtualNode(
  a: NormalizedVirtualNode | undefined,
  b: NormalizedVirtualNode | undefined,
): boolean {
  if (!a || !b) {
    return false
  }

  if (a.type === Text && b.type === Text) {
    /* `Text` 不使用 `key` 区分：只要都是 `Text` 就认为可复用宿主文本节点。 */
    return true
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
 * 从 `children` 的指定位置向后寻找“下一个可用锚点”。
 *
 * @remarks
 * - 这里使用 `runtime.handle.nodes[0]` 作为锚点，是因为一个 `vnode` 可能对应多宿主节点（如 `Fragment`）。
 * - 找不到时返回 `fallback`（通常来自父级传入的 `anchor`）。
 */
export function findNextAnchor<HostNode>(
  children: NormalizedChildren,
  startIndex: number,
  fallback: HostNode | undefined,
): HostNode | undefined {
  for (let index = startIndex; index < children.length; index += 1) {
    const firstNode = getFirstHostNode<HostNode>(children[index])

    if (firstNode) {
      /* 取该 `vnode` 对应的首个宿主节点，作为后续插入的稳定锚点。 */
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
    /* `key` 必须是“存在且非 `null`”：与 Vue 的 `key` 语义对齐，避免把 `null` 当成有效 `key`。 */
    return child.key !== undefined && child.key !== null
  })
}

/**
 * 在 `patch` 过程中同步 runtime 元数据，使“新 `vnode`”复用“旧 `vnode`”的宿主引用。
 *
 * @remarks
 * - `el`/`handle` 会在 `mount` 时写入，`patch` 时必须继承以避免重复创建/丢失 `teardown` 能力。
 * - `anchor`/`component` 允许按需覆盖：例如 `Text`/`Fragment` 分支会显式清空 `component`。
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
