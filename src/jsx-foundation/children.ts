import { Comment, virtualNodeFlag } from './constants.ts'
import { isVirtualNode } from './guards.ts'
import type { VirtualNode, VirtualNodeChild } from './types.ts'
import { jsxUnsupportedChildWarning } from '@/messages/index.ts'
import { __DEV__, isNil } from '@/shared/index.ts'

/**
 * 开发态兜底告警：提示用户传入了运行时无法渲染的 `children`。
 *
 * @remarks
 * - 仅在 `__DEV__` 下启用，避免影响生产性能与输出。
 * - 运行时会忽略不受支持的 `children` 类型（与 Vue 3 行为对齐），该告警用于辅助定位问题。
 *
 * @param child - 不受支持的子节点值
 */
function warnUnsupportedChild(child: unknown): void {
  if (!__DEV__) {
    return
  }

  console.warn(jsxUnsupportedChildWarning, child)
}

/**
 * 将任意形式的 `children` 归一化为扁平的 `VirtualNodeChild` 数组。
 *
 * @remarks
 * - `null`/`undefined`/`boolean` 会被归一化为 `Comment` `virtualNode`，用于空渲染占位（与 Vue3 行为对齐）。
 *   - 项目内部约定不使用 `null`，但用户传入的 `children` 仍可能出现 `null`，这里将其视为「空值」一并处理。
 * - 递归展开嵌套数组 `children`，并保持原始顺序不变。
 * - 字符串与数字保留原样，由渲染层按需包装为文本节点。
 *
 * @param rawChildren - 原始 `children` 输入，可以是任意类型
 * @returns 扁平化后的 `VirtualNodeChild` 数组，仅包含 `VirtualNode`、`string`、`number`
 */
export function normalizeChildren(rawChildren: unknown): VirtualNodeChild[] {
  const result: VirtualNodeChild[] = []

  /* 通过递归扁平化，将可渲染的 child 收集到同一个数组中 */
  flattenChild(rawChildren, result)

  return result
}

/**
 * 内部递归助手，根据不同输入类型填充归一化后的 `children` 列表。
 *
 * @remarks
 * - 递归过程不返回新数组，而是写入 `accumulator`，减少中间数组分配。
 * - 遇到不支持的类型时会直接忽略，在开发态额外给出告警。
 * - 处理顺序：空值 → 数组 → virtualNode → 字符串/数字 → 其他（忽略）
 *
 * @param rawChild - 待处理的单个子节点
 * @param accumulator - 收集结果的目标数组
 */
function flattenChild(rawChild: unknown, accumulator: VirtualNodeChild[]): void {
  /* `null`、`undefined`、`boolean` 等空值归一化为注释占位，避免出现「0 节点」区间。 */
  if (isNil(rawChild) || typeof rawChild === 'boolean') {
    const placeholder: VirtualNode<typeof Comment> = {
      [virtualNodeFlag]: true,
      type: Comment,
      props: undefined,
      children: [],
      text: '',
    }

    accumulator.push(placeholder)

    return
  }

  /* 数组 `children` 需要递归展开，保持原有顺序 */
  if (Array.isArray(rawChild)) {
    for (const nestedChild of rawChild) {
      flattenChild(nestedChild, accumulator)
    }

    return
  }

  /* 已经是 `virtualNode` 的值直接保留，不做额外包装 */
  if (isVirtualNode(rawChild)) {
    accumulator.push(rawChild)

    return
  }

  /* 字符串与数字作为文本节点内容直接入队，渲染层会按需包装 */
  if (typeof rawChild === 'string' || typeof rawChild === 'number') {
    accumulator.push(rawChild)

    return
  }

  /* 函数、对象等不受支持类型直接忽略，保持与 Vue 3 对齐 */
  if (__DEV__) {
    warnUnsupportedChild(rawChild)
  }
}
