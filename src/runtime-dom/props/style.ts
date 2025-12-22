import { runtimeDomInvalidStyleValue } from '@/messages/index.ts'
import { __DEV__, isNil, isObject } from '@/shared/index.ts'

/** 处理内联样式字符串/对象。 */
export function handleStyleProp(
  element: Element,
  key: string,
  previous: unknown,
  next: unknown,
): boolean {
  if (key !== 'style') return false

  applyStyle(element as HTMLElement, previous, next)

  return true
}

/** 写入单个样式属性，兼容标准属性名与自定义属性名。 */
function setStyleValue(element: HTMLElement, property: string, input: string): void {
  if (Reflect.has(element.style, property)) {
    ;(element.style as WritableStyle)[property] = input
  } else {
    element.style.setProperty(property, input)
  }
}

/**
 * 处理 `style` 属性，支持字符串和对象两种写法。
 */
function applyStyle(element: HTMLElement, previous: unknown, next: unknown): void {
  if (isNil(next) || next === false) {
    element.removeAttribute('style')

    return
  }

  if (typeof next === 'string') {
    element.setAttribute('style', next)

    return
  }

  if (isObject(next)) {
    const nextStyle = next as Record<string, unknown>

    /* 所有属性都为 `null`/`undefined` 时移除整个 `style`，避免空标记残留。 */
    if (
      Object.values(nextStyle).every((item) => {
        return isNil(item)
      })
    ) {
      element.removeAttribute('style')

      /* Playwright 浏览器下偶发保留空 `style` 特性，显式清空后再移除确保属性消失。 */
      if (element.getAttribute('style') !== null) {
        element.style.cssText = ''
        element.removeAttribute('style')
      }

      return
    }

    const previousStyle = isObject(previous) ? (previous as Record<string, unknown>) : {}
    let hasValue = false

    /* 先处理删除：前一版本存在但当前已移除或置空的键需写入空字符串。 */
    for (const name of Object.keys(previousStyle)) {
      if (!Object.hasOwn(nextStyle, name) || isNil(nextStyle[name])) {
        setStyleValue(element, name, '')
      }
    }

    /* 再处理新增/更新：仅接受 `string` 或 `number`，其他类型开发态发出警告。 */
    for (const [name, styleValue] of Object.entries(nextStyle)) {
      if (isNil(styleValue)) {
        setStyleValue(element, name, '')

        continue
      }

      if (typeof styleValue !== 'string' && typeof styleValue !== 'number') {
        if (__DEV__) {
          console.warn(runtimeDomInvalidStyleValue(name, typeof styleValue), styleValue)
        }

        continue
      }

      const stringValue: string = typeof styleValue === 'number' ? String(styleValue) : styleValue

      setStyleValue(element, name, stringValue)
      hasValue = true
    }

    /* 对象写法未留下有效值时移除 `style` 特性，保持与空对象等价。 */
    if (!hasValue) {
      element.removeAttribute('style')
    }
  }
}

/** 扩展原生 `style` 声明，允许对任意属性键执行写入。 */
type WritableStyle = CSSStyleDeclaration & Record<string, string | undefined>
