/**
 * Keyed children diff/patch 实现（Phase B: 头尾同步 + key map）。
 */
import { patchChild, isSameVNodeType } from './index.ts'
import { unmountChild } from './unmount.ts'
import type { RendererOptions } from '../renderer.ts'
import type { MountedHandle } from '../mount/handle.ts'
import { mountChild } from '../mount/child.ts'
import type { MountContext } from '../mount/context.ts'
import type { RenderOutput, VirtualNode } from '@/jsx-foundation/index.ts'
import { isVirtualNode } from '@/jsx-foundation/index.ts'

/**
 * 获取 VNode 的 key。
 */
function getVNodeKey(child: RenderOutput): PropertyKey | undefined {
  if (isVirtualNode(child)) {
    return child.key
  }

  return undefined
}

/**
 * 判断 children 是否包含 key。
 */
export function hasKeyedChildren(children: RenderOutput[]): boolean {
  for (const child of children) {
    if (getVNodeKey(child) !== undefined) {
      return true
    }
  }

  return false
}

/**
 * patch keyed children（头尾同步 + key map 算法）。
 *
 * @remarks
 * - 头部同步（从左到右）
 * - 尾部同步（从右到左）
 * - 中间区间处理：key map + 最长递增子序列
 *
 * @param options - 宿主渲染原语
 * @param oldChildren - 旧 children 数组
 * @param newChildren - 新 children 数组
 * @param container - 父容器
 * @param oldHandles - 旧 children 的挂载句柄数组
 * @param anchor - 插入锚点
 * @param context - 挂载上下文
 * @returns 新 children 的挂载句柄数组
 */
export function patchKeyedChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  oldChildren: RenderOutput[],
  newChildren: RenderOutput[],
  container: HostElement,
  oldHandles: Array<MountedHandle<HostNode> | undefined>,
  anchor?: HostNode,
  context?: MountContext,
): Array<MountedHandle<HostNode> | undefined> {
  let oldStart = 0
  let oldEnd = oldChildren.length - 1
  let newStart = 0
  let newEnd = newChildren.length - 1

  const newHandles: Array<MountedHandle<HostNode> | undefined> = new Array(newChildren.length)

  /* 1. 头部同步（从左到右）。 */
  while (oldStart <= oldEnd && newStart <= newEnd) {
    const oldChild = oldChildren[oldStart]
    const newChild = newChildren[newStart]

    if (canPatch(oldChild, newChild)) {
      newHandles[newStart] = patchChild(
        options,
        oldChild,
        newChild,
        container,
        anchor,
        oldHandles[oldStart],
        context,
      )
      oldStart++
      newStart++
    } else {
      break
    }
  }

  /* 2. 尾部同步（从右到左）。 */
  while (oldStart <= oldEnd && newStart <= newEnd) {
    const oldChild = oldChildren[oldEnd]
    const newChild = newChildren[newEnd]

    if (canPatch(oldChild, newChild)) {
      newHandles[newEnd] = patchChild(
        options,
        oldChild,
        newChild,
        container,
        anchor,
        oldHandles[oldEnd],
        context,
      )
      oldEnd--
      newEnd--
    } else {
      break
    }
  }

  /* 3. 处理边界情况。 */

  /* 3.1 旧 children 已处理完，新 children 有剩余：mount 新增节点。 */
  if (oldStart > oldEnd) {
    if (newStart <= newEnd) {
      /* 找到插入锚点：newEnd+1 位置的节点（如果存在）。 */
      const nextPos = newEnd + 1
      const nextAnchor =
        nextPos < newChildren.length ? (newHandles[nextPos]?.nodes[0] ?? anchor) : anchor

      for (let i = newStart; i <= newEnd; i++) {
        newHandles[i] = mountChildAt(options, newChildren[i], container, nextAnchor, context)
      }
    }

    return newHandles
  }

  /* 3.2 新 children 已处理完，旧 children 有剩余：unmount 多余节点。 */
  if (newStart > newEnd) {
    for (let i = oldStart; i <= oldEnd; i++) {
      unmountChild(oldHandles[i])
    }

    return newHandles
  }

  /* 4. 中间区间处理。 */

  /* 4.1 建立 key → newIndex map。 */
  const keyToNewIndexMap = new Map<PropertyKey, number>()

  for (let i = newStart; i <= newEnd; i++) {
    const key = getVNodeKey(newChildren[i])

    if (key !== undefined) {
      keyToNewIndexMap.set(key, i)
    }
  }

  /* 4.2 遍历旧 children 中间区间，匹配 patch 或 unmount。 */
  let patched = 0
  const toBePatched = newEnd - newStart + 1
  const newIndexToOldIndexMap = new Array<number>(toBePatched).fill(0)
  let moved = false
  let maxNewIndexSoFar = 0

  for (let i = oldStart; i <= oldEnd; i++) {
    const oldChild = oldChildren[i]

    if (patched >= toBePatched) {
      /* 所有新节点都已 patch，剩余旧节点需要 unmount。 */
      unmountChild(oldHandles[i])
      continue
    }

    let newIndex: number | undefined

    const oldKey = getVNodeKey(oldChild)

    if (oldKey !== undefined) {
      /* 通过 key 查找。 */
      newIndex = keyToNewIndexMap.get(oldKey)
    } else {
      /* 无 key 时遍历查找可复用节点。 */
      for (let j = newStart; j <= newEnd; j++) {
        if (newIndexToOldIndexMap[j - newStart] === 0 && canPatch(oldChild, newChildren[j])) {
          newIndex = j
          break
        }
      }
    }

    if (newIndex === undefined) {
      /* 未找到匹配，unmount 旧节点。 */
      unmountChild(oldHandles[i])
    } else {
      /* 记录映射关系（+1 避免与初始值 0 冲突）。 */
      newIndexToOldIndexMap[newIndex - newStart] = i + 1

      /* 检测是否需要移动。 */
      if (newIndex >= maxNewIndexSoFar) {
        maxNewIndexSoFar = newIndex
      } else {
        moved = true
      }

      /* patch 匹配的节点。 */
      newHandles[newIndex] = patchChild(
        options,
        oldChild,
        newChildren[newIndex],
        container,
        anchor,
        oldHandles[i],
        context,
      )
      patched++
    }
  }

  /* 4.3 移动和挂载新节点。 */
  const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []
  let j = increasingNewIndexSequence.length - 1

  /* 从后向前遍历，确保插入位置正确。 */
  for (let i = toBePatched - 1; i >= 0; i--) {
    const newIndex = newStart + i
    const newChild = newChildren[newIndex]
    const nextPos = newIndex + 1
    const nextAnchor =
      nextPos < newChildren.length ? (newHandles[nextPos]?.nodes[0] ?? anchor) : anchor

    if (newIndexToOldIndexMap[i] === 0) {
      /* 新节点，需要 mount。 */
      newHandles[newIndex] = mountChildAt(options, newChild, container, nextAnchor, context)
    } else if (moved) {
      /* 需要移动。 */
      if (j < 0 || i !== increasingNewIndexSequence[j]) {
        /* 当前节点不在最长递增子序列中，需要移动。 */
        const handle = newHandles[newIndex]

        if (handle) {
          for (const node of handle.nodes) {
            options.insertBefore(container, node, nextAnchor)
          }
        }
      } else {
        /* 当前节点在最长递增子序列中，不需要移动。 */
        j--
      }
    }
  }

  return newHandles
}

/**
 * 判断两个 children 是否可以 patch（类型+key 相同）。
 */
function canPatch(oldChild: RenderOutput, newChild: RenderOutput): boolean {
  if (isVirtualNode(oldChild) && isVirtualNode(newChild)) {
    return isSameVNodeType(oldChild as VirtualNode, newChild as VirtualNode)
  }

  /* 非 VNode 类型（text）按类型比较。 */
  const oldType = typeof oldChild
  const newType = typeof newChild

  if ((oldType === 'string' || oldType === 'number') && (newType === 'string' || newType === 'number')) {
    return true
  }

  return false
}

/**
 * 在指定锚点前挂载子节点。
 */
function mountChildAt<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  child: RenderOutput | undefined,
  container: HostElement | HostFragment,
  anchor: HostNode | undefined,
  context?: MountContext,
): MountedHandle<HostNode> | undefined {
  if (anchor) {
    /* 有锚点时，先挂载到 fragment，再整体插入到锚点前。 */
    const fragment = options.createFragment()
    const mounted = mountChild(options, child, fragment, context)

    for (const node of mounted?.nodes ?? []) {
      options.insertBefore(container, node, anchor)
    }

    return mounted
  }

  /* 无锚点，直接挂载到容器末尾。 */
  return mountChild(options, child, container, context)
}

/**
 * 计算最长递增子序列的索引数组。
 *
 * @remarks
 * 用于最小化 DOM 移动操作。
 */
function getSequence(arr: number[]): number[] {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length

  for (i = 0; i < len; i++) {
    const arrI = arr[i]

    if (arrI !== 0) {
      j = result[result.length - 1]

      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }

      u = 0
      v = result.length - 1

      while (u < v) {
        c = (u + v) >> 1

        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }

      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }

        result[u] = i
      }
    }
  }

  u = result.length
  v = result[u - 1]

  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }

  return result
}
