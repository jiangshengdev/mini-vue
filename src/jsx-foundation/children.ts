import { isVirtualNode } from './guards.ts'
import type { VirtualNodeChild } from './types.ts'
import { __DEV__, isNil } from '@/shared/index.ts'

/**
 * 开发态兜底告警：提示用户传入了运行时无法渲染的 children。
 *
 * @remarks
 * - 仅在 `__DEV__` 下启用，避免影响生产性能与输出。
 */
function warnUnsupportedChild(child: unknown): void {
  if (!__DEV__) {
    return
  }

  console.warn('[jsx] 检测到无法渲染的 children，已被忽略：', child)
}

/**
 * 将任意形式的 children 归一化为扁平的 VirtualNodeChild 数组。
 */
export function normalizeChildren(rawChildren: unknown): VirtualNodeChild[] {
  const result: VirtualNodeChild[] = []

  flattenChild(rawChildren, result)

  return result
}

/**
 * 内部递归助手，根据不同输入类型填充归一化后的 children 列表。
 */
function flattenChild(rawChild: unknown, accumulator: VirtualNodeChild[]): void {
  /* `null`、`undefined`、`boolean` 等空值在渲染层会被忽略 */
  if (isNil(rawChild) || typeof rawChild === 'boolean') {
    return
  }

  /* 数组 children 需要递归展开，保持原有顺序 */
  if (Array.isArray(rawChild)) {
    for (const nestedChild of rawChild) {
      flattenChild(nestedChild, accumulator)
    }

    return
  }

  /* 已经是 virtualNode 的值直接保留，不做包装 */
  if (isVirtualNode(rawChild)) {
    accumulator.push(rawChild)

    return
  }

  /* 字符串与数字作为文本节点内容直接入队 */
  if (typeof rawChild === 'string' || typeof rawChild === 'number') {
    accumulator.push(rawChild)

    return
  }

  /* 函数、对象等不受支持类型直接忽略，保持与 Vue 3 对齐 */
  if (__DEV__) {
    warnUnsupportedChild(rawChild)
  }
}
