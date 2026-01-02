/**
 * 元素引用处理模块。
 *
 * 本模块负责识别 `ref` 属性并跳过 props 打补丁流程，
 * 实际的 ref 赋值由上层（runtime-core）在挂载/卸载时处理。
 *
 * 支持两种 ref 形式：
 * - 回调函数：`(element: Element | undefined) => void`
 * - 响应式 ref：`Ref<Element | undefined>`
 */
import type { Ref } from '@/reactivity/index.ts'
import { isRef } from '@/reactivity/index.ts'

/**
 * 元素引用类型，支持回调函数或响应式 ref。
 *
 * @beta
 */
export type ElementRef = ((element: Element | undefined) => void) | Ref<Element | undefined>

/**
 * 判断传入值是否为元素 ref 处理器或响应式 ref。
 *
 * @param value - 待判定的值
 * @returns 是否符合元素 ref 形态
 */
function isElementRef(value: unknown): value is ElementRef {
  return typeof value === 'function' || isRef<Element | undefined>(value)
}

/**
 * 判断是否应跳过 ref 属性的 props 打补丁。
 *
 * ref 由上层（runtime-core）在挂载/卸载时处理，这里直接跳过。
 *
 * @param key - 属性名
 * @param previous - 上一次的属性值
 * @param next - 本次的属性值
 * @returns 是否应跳过该属性
 */
export function ignoreRefProp(key: string, previous: unknown, next: unknown): boolean {
  return key === 'ref' && (isElementRef(previous) || isElementRef(next))
}
