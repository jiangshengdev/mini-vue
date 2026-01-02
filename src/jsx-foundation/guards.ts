/**
 * `virtualNode` 的运行时守卫。
 */
import { virtualNodeFlag } from './constants.ts'
import type { VirtualNode } from './types.ts'
import { isObject } from '@/shared/index.ts'

/**
 * 判断一个值是否为 `virtualNode`（通过 `virtualNodeFlag` 标记）。
 *
 * @param value - 待检测的任意值
 * @returns 若为 `virtualNode` 返回 `true`
 */
export function isVirtualNode(value: unknown): value is VirtualNode {
  /* 先确保是对象再读标记，避免对原始值做属性检查。 */
  return isObject(value) && Object.hasOwn(value, virtualNodeFlag) && value[virtualNodeFlag] === true
}
