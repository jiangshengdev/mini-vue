import type { Ref } from '@/reactivity/index.ts'
import { isRef } from '@/reactivity/index.ts'

/**
 * @beta
 */
export type ElementRef = ((element: Element | undefined) => void) | Ref<Element | undefined>

/** 判断传入值是否为元素 `ref` 处理器或响应式 `ref`。 */
function isElementRef(value: unknown): value is ElementRef {
  return typeof value === 'function' || isRef<Element | undefined>(value)
}

/** `ref` 由上层处理，这里直接跳过。 */
export function ignoreRefProp(key: string, previous: unknown, next: unknown): boolean {
  return key === 'ref' && (isElementRef(previous) || isElementRef(next))
}
