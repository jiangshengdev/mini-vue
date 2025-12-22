import { runtimeDomInvalidStyleValue } from '@/messages/index.ts'
import { __DEV__, isNil, isObject } from '@/shared/index.ts'

/** 处理内联样式字符串/对象。 */
export function handleStyleProp(
  element: Element,
  key: string,
  previous: unknown,
  next: unknown,
): boolean {
  if (key !== 'style') {
    return false
  }

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
  /* 传入空值或 `false` 时移除整段内联样式。 */
  if (isNil(next) || next === false) {
    if (isNil(previous) || previous === false) {
      return
    }

    element.removeAttribute('style')

    return
  }

  if (typeof next === 'string') {
    /* 字符串内联样式未变时跳过写入（不读取 DOM）。 */
    if (typeof previous === 'string' && previous === next) {
      return
    }

    element.setAttribute('style', next)

    return
  }

  if (isObject(next)) {
    const nextStyle = next as Record<string, unknown>
    const previousStyle = isObject(previous) ? (previous as Record<string, unknown>) : {}

    /* 所有属性都为 `null`/`undefined` 时移除整个 `style`，避免空标记残留。 */
    if (
      Object.values(nextStyle).every((item) => {
        return isNil(item)
      })
    ) {
      if (Object.keys(previousStyle).length === 0) {
        return
      }

      element.removeAttribute('style')

      /* Playwright 浏览器下偶发保留空 `style` 特性，显式清空后再移除确保属性消失。 */
      if (element.getAttribute('style') !== null) {
        element.style.cssText = ''
        element.removeAttribute('style')
      }

      return
    }

    patchStyleObject(element, previousStyle, nextStyle)
  }
}

function patchStyleObject(
  element: HTMLElement,
  previousStyle: Record<string, unknown>,
  nextStyle: Record<string, unknown>,
): void {
  const keysToRemove = new Set<string>()
  const entriesToSet: Array<[string, string]> = []

  /* 先找出需要删除的键。 */
  for (const name of Object.keys(previousStyle)) {
    if (!Object.hasOwn(nextStyle, name) || isNil(nextStyle[name])) {
      keysToRemove.add(name)
    }
  }

  /* 再收集需要写入的键，基于 props 判等跳过。 */
  for (const [name, styleValue] of Object.entries(nextStyle)) {
    if (isNil(styleValue)) {
      keysToRemove.add(name)

      continue
    }

    if (typeof styleValue !== 'string' && typeof styleValue !== 'number') {
      if (__DEV__) {
        console.warn(runtimeDomInvalidStyleValue(name, typeof styleValue), styleValue)
      }

      continue
    }

    const normalized = typeof styleValue === 'number' ? String(styleValue) : styleValue
    const previousRaw = previousStyle[name]
    const previousNormalized =
      typeof previousRaw === 'string' || typeof previousRaw === 'number'
        ? String(previousRaw)
        : undefined

    if (previousNormalized === normalized) {
      continue
    }

    entriesToSet.push([name, normalized])
  }

  if (keysToRemove.size === 0 && entriesToSet.length === 0) {
    return
  }

  for (const name of keysToRemove) {
    setStyleValue(element, name, '')
  }

  let hasValue = false

  for (const [name, value] of entriesToSet) {
    setStyleValue(element, name, value)
    hasValue = true
  }

  /* 对象写法未留下有效值时移除 `style` 特性，保持与空对象等价。 */
  if (!hasValue) {
    element.removeAttribute('style')
  }
}

/** 扩展原生 `style` 声明，允许对任意属性键执行写入。 */
type WritableStyle = CSSStyleDeclaration & Record<string, string | undefined>
