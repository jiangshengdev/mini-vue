/**
 * `children` 归一化：将渲染返回的子节点整理为扁平的 `VirtualNodeChild[]`。
 *
 * @remarks
 * - 空值/布尔会被转换为 `Comment` 占位，避免出现「0 节点区间」。
 */
import { Comment, virtualNodeFlag } from './constants.ts'
import { isVirtualNode } from './guards.ts'
import type { VirtualNode, VirtualNodeChild } from './types.ts'
import { jsxUnsupportedChildWarning } from '@/messages/index.ts'
import { __DEV__, isNil } from '@/shared/index.ts'

/**
 * 开发态：提示传入了运行时无法渲染的 `children` 值。
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
 * 归一化 `children`：扁平化数组，并把空值/布尔转为 `Comment` 占位。
 *
 * @param rawChildren - 原始 `children` 输入
 * @returns 归一化后的子节点数组
 */
export function normalizeChildren(rawChildren: unknown): VirtualNodeChild[] {
  const result: VirtualNodeChild[] = []

  /* 递归扁平化并收集可渲染子节点。 */
  flattenChild(rawChildren, result)

  return result
}

/**
 * 递归展开并收集可渲染的子节点到 `accumulator`。
 *
 * @param rawChild - 待处理的单个子节点
 * @param accumulator - 用于收集归一化结果的数组
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

  /* 数组 `children` 递归展开，保持顺序。 */
  if (Array.isArray(rawChild)) {
    for (const nestedChild of rawChild) {
      flattenChild(nestedChild, accumulator)
    }

    return
  }

  /* `virtualNode` 直接透传。 */
  if (isVirtualNode(rawChild)) {
    accumulator.push(rawChild)

    return
  }

  /* 字符串/数字作为文本内容入队，渲染层再包装。 */
  if (typeof rawChild === 'string' || typeof rawChild === 'number') {
    accumulator.push(rawChild)

    return
  }

  /* 不支持的类型直接忽略（仅开发态告警）。 */
  if (__DEV__) {
    warnUnsupportedChild(rawChild)
  }
}
