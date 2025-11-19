import type { VNode } from './types.ts'
import { vnodeFlag } from './types.ts'
import { isObject } from '@/shared/utils.ts'

/**
 * 判断给定值是否为由本系统创建的 VNode 对象。
 */
export function isVNode(value: unknown): value is VNode {
  if (!isObject(value)) {
    return false
  }

  return Object.hasOwn(value, vnodeFlag)
}
