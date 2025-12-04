import type { VirtualNode } from '@/jsx/index.ts'
import { virtualNodeFlag } from '@/jsx/index.ts'
import { isObject } from '@/shared/utils.ts'

/**
 * 判断给定值是否为由本系统创建的 virtualNode 对象。
 */
export function isVirtualNode(value: unknown): value is VirtualNode {
  if (!isObject(value)) {
    return false
  }

  return Object.hasOwn(value, virtualNodeFlag)
}
