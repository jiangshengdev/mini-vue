import { isVirtualNode } from './guards.ts'
import type { VirtualNodeChild } from './types.ts'
import { jsxUnsupportedChildWarning } from '@/messages/index.ts'
import { __DEV__, isNil } from '@/shared/index.ts'

/**
 * 开发态兜底告警：提示用户传入了运行时无法渲染的 `children`。
 *
 * @remarks
 * - 仅在 `__DEV__` 下启用，避免影响生产性能与输出。
 * - 运行时会忽略不受支持的 `children` 类型（与 Vue 3 行为对齐），该告警用于辅助定位问题。
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
 * - 过滤掉 `null`/`undefined`/`boolean` 等「可忽略」值。
 * - 递归展开数组 `children`，并保持原始顺序不变。
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
 */
function flattenChild(rawChild: unknown, accumulator: VirtualNodeChild[]): void {
  /* `null`、`undefined`、`boolean` 等空值在渲染层会被忽略 */
  if (isNil(rawChild) || typeof rawChild === 'boolean') {
    return
  }

  /* 数组 `children` 需要递归展开，保持原有顺序 */
  if (Array.isArray(rawChild)) {
    for (const nestedChild of rawChild) {
      flattenChild(nestedChild, accumulator)
    }

    return
  }

  /* 已经是 `virtualNode` 的值直接保留，不做包装 */
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
