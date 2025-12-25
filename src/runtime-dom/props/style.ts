/**
 * Style 属性处理模块。
 *
 * 本模块负责将 `style` props 写入 DOM，支持：
 * - 字符串形式：直接设置 `style` attribute
 * - 对象形式：逐属性写入，支持增量更新与删除
 * - 空值/false：移除整个 `style` attribute
 *
 * 对象形式的增量更新策略：
 * 1. 收集需要删除的键（旧有但新无，或新值为 null/undefined）
 * 2. 收集需要写入的键（值有变化的 string/number）
 * 3. 批量执行删除和写入，减少 DOM 操作次数
 */
import { runtimeDomInvalidStyleValue } from '@/messages/index.ts'
import { __DEV__, isNil, isObject } from '@/shared/index.ts'

/**
 * 处理内联样式字符串/对象。
 *
 * @param element - 目标 DOM 元素
 * @param key - 属性名，仅处理 `style`
 * @param previous - 上一次的属性值
 * @param next - 本次的属性值
 * @returns 是否已处理该属性（`true` 表示已处理，调用方应跳过后续逻辑）
 */
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

/**
 * 写入单个样式属性。
 *
 * 兼容标准属性名（如 `color`）与自定义属性名（如 `--my-var`）：
 * - 标准属性：直接通过 `style[property]` 写入
 * - 自定义属性：通过 `setProperty` 写入
 *
 * @param element - 目标 DOM 元素
 * @param property - 样式属性名
 * @param input - 样式值，空字符串表示删除
 */
function setStyleValue(element: HTMLElement, property: string, input: string): void {
  if (Reflect.has(element.style, property)) {
    ;(element.style as WritableStyle)[property] = input
  } else {
    element.style.setProperty(property, input)
  }
}

/**
 * 处理 style 属性的核心逻辑。
 *
 * @param element - 目标 DOM 元素
 * @param previous - 上一次的 style 值
 * @param next - 本次的 style 值
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

/**
 * 对象形式 style 的增量更新。
 *
 * 策略：
 * 1. 遍历旧对象，找出需要删除的键（新对象中不存在或值为 null/undefined）
 * 2. 遍历新对象，找出需要写入的键（值有变化的 string/number）
 * 3. 批量执行删除（设为空字符串）和写入
 * 4. 若最终无有效值，移除整个 style attribute
 *
 * @param element - 目标 DOM 元素
 * @param previousStyle - 上一次的 style 对象
 * @param nextStyle - 本次的 style 对象
 */
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

/**
 * 扩展原生 CSSStyleDeclaration 声明，允许对任意属性键执行写入。
 *
 * 用于支持自定义 CSS 属性（如 `--my-var`）的类型安全写入。
 */
type WritableStyle = CSSStyleDeclaration & Record<string, string | undefined>
