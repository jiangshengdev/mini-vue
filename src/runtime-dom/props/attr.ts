import { runtimeDomUnsupportedAttrValue } from '@/messages/index.ts'
import { __DEV__, isNil } from '@/shared/index.ts'

/**
 * 处理普通 DOM 属性，包括布尔属性的存在性表达。
 */
export function patchDomAttr(
  element: Element,
  key: string,
  previous: unknown,
  next: unknown,
): void {
  /* `null`/`false` 都表示属性应被移除。 */
  if (isNil(next) || next === false) {
    if (isNil(previous) || previous === false) {
      return
    }

    element.removeAttribute(key)

    return
  }

  /* 布尔 `true` 直接写入空字符串，符合 HTML 布尔属性语义。 */
  if (next === true) {
    if (previous === true) {
      return
    }

    element.setAttribute(key, '')

    return
  }

  /* 仅接受 `string` 或 `number`，其他类型直接忽略写入。 */
  if (typeof next === 'string' || typeof next === 'number') {
    const normalized = String(next)
    const previousNormalized =
      typeof previous === 'string' || typeof previous === 'number' ? String(previous) : undefined

    if (previousNormalized === normalized) {
      return
    }

    element.setAttribute(key, normalized)

    return
  }

  if (__DEV__) {
    console.warn(runtimeDomUnsupportedAttrValue(key, typeof next), next)
  }
}
