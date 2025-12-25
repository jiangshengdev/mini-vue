import { virtualNodeFlag } from './constants.ts'
import type { VirtualNode } from './types.ts'
import { isObject } from '@/shared/index.ts'

/**
 * 判断给定值是否为由本系统创建的 `virtualNode` 对象。
 *
 * @remarks
 * - 通过检测 `virtualNodeFlag` 符号属性区分普通对象与内部节点结构。
 * - 该守卫用于 `children` 归一化、渲染层节点分发等场景。
 *
 * @param value - 待检测的任意值
 * @returns 若 `value` 是由 `createVirtualNode` 或 `createTextVirtualNode` 创建的节点则返回 `true`
 */
export function isVirtualNode(value: unknown): value is VirtualNode {
  /* 先确保是对象，再检测内部标记，避免对原始值调用 `hasOwn` */
  return isObject(value) && Object.hasOwn(value, virtualNodeFlag) && value[virtualNodeFlag] === true
}
