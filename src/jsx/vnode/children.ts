import type { VNodeChild } from './types.ts'
import { isVNode } from './guards.ts'

export function normalizeChildren(input: unknown): VNodeChild[] {
  const result: VNodeChild[] = []
  collectChildren(input, result)
  return result
}

function collectChildren(source: unknown, target: VNodeChild[]) {
  if (source == null || typeof source === 'boolean') {
    return
  }

  if (Array.isArray(source)) {
    for (const child of source) {
      collectChildren(child, target)
    }
    return
  }

  if (isVNode(source)) {
    target.push(source)
    return
  }

  if (typeof source === 'string' || typeof source === 'number') {
    target.push(source)
    return
  }

  target.push(String(source))
}
