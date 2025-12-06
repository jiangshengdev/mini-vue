import type { VirtualNode } from '@/jsx/index.ts'
import { virtualNodeFlag } from '@/jsx/index.ts'
import { isObject } from '@/shared/index.ts'

/**
 * 判断给定值是否为由本系统创建的 virtualNode 对象。
 */
export function isVirtualNode(value: unknown): value is VirtualNode {
  return isObject(value) && Object.hasOwn(value, virtualNodeFlag) && value[virtualNodeFlag] === true
}
