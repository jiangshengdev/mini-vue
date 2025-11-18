import type { VNodeChild } from './types.ts'
import { isVNode } from './guards.ts'

/**
 * 将任意形式的 children 归一化为扁平的 VNodeChild 数组。
 */
export function normalizeChildren(rawChildren: unknown): VNodeChild[] {
  const result: VNodeChild[] = []

  flattenChild(rawChildren, result)

  return result
}

/**
 * 内部递归助手，根据不同输入类型填充归一化后的 children 列表。
 */
function flattenChild(rawChild: unknown, accumulator: VNodeChild[]) {
  /* null、undefined、boolean 等空值在渲染层会被忽略 */
  if (rawChild == null || typeof rawChild === 'boolean') {
    return
  }

  /* 数组 children 需要递归展开，保持原有顺序 */
  if (Array.isArray(rawChild)) {
    for (const nestedChild of rawChild) {
      flattenChild(nestedChild, accumulator)
    }

    return
  }

  /* 已经是 VNode 的值直接保留，不做包装 */
  if (isVNode(rawChild)) {
    accumulator.push(rawChild)

    return
  }

  /* 字符串与数字作为文本节点内容直接入队 */
  if (typeof rawChild === 'string' || typeof rawChild === 'number') {
    accumulator.push(rawChild)

    return
  }

  /* 其余类型统一转为字符串，方便调试输出 */
  accumulator.push(String(rawChild))
}
