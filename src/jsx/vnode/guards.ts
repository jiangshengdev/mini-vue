import type { VNode } from './types.ts'
import { vnodeSymbol } from './types.ts'

export function isVNode(value: unknown): value is VNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__v_isVNode' in value &&
    (value as { __v_isVNode: symbol }).__v_isVNode === vnodeSymbol
  )
}
