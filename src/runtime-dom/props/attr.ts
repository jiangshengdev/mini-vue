import { runtimeDomUnsupportedAttrValue } from '@/messages/index.ts'
import { __DEV__, isNil } from '@/shared/index.ts'

/**
 * 处理普通 DOM 属性，包括布尔属性的存在性表达。
 */
export function patchDomAttr(element: Element, key: string, value: unknown): void {
  /* `null`/`false` 都表示属性应被移除。 */
  if (isNil(value) || value === false) {
    element.removeAttribute(key)

    return
  }

  /* 布尔 `true` 直接写入空字符串，符合 HTML 布尔属性语义。 */
  if (value === true) {
    element.setAttribute(key, '')

    return
  }

  /* 仅接受 `string` 或 `number`，其他类型直接忽略写入。 */
  if (typeof value === 'string' || typeof value === 'number') {
    element.setAttribute(key, String(value))

    return
  }

  if (__DEV__) {
    console.warn(runtimeDomUnsupportedAttrValue(key, typeof value), value)
  }
}
