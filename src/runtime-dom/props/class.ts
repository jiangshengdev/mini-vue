/**
 * Class 属性处理模块。
 *
 * 本模块负责将 `class`/`className` props 归一化并写入 DOM，支持：
 * - 字符串形式：直接使用
 * - 数组形式：递归展开后用空格连接
 * - 对象形式：truthy 的键作为类名
 * - 混合嵌套：以上形式的任意组合
 */
import { isNil, isObject } from '@/shared/index.ts'

/**
 * 统一处理 `class`/`className` 属性。
 *
 * @param element - 目标 DOM 元素
 * @param key - 属性名，仅处理 `class` 或 `className`
 * @param previous - 上一次的属性值
 * @param next - 本次的属性值
 * @returns 是否已处理该属性（`true` 表示已处理，调用方应跳过后续逻辑）
 */
export function handleClassProp(
  element: Element,
  key: string,
  previous: unknown,
  next: unknown,
): boolean {
  if (key !== 'class' && key !== 'className') {
    return false
  }

  const previousClassName = normalizeClassProp(previous)
  const nextClassName = normalizeClassProp(next)

  /* 仅基于 props 判等，不读取 DOM。 */
  if (previousClassName === nextClassName) {
    return true
  }

  ;(element as HTMLElement).className = nextClassName

  return true
}

/**
 * 将 class 属性值归一化为字符串，空值返回空字符串。
 *
 * @param value - 传入的 class 值
 * @returns 归一化后的类名字符串
 */
function normalizeClassProp(value: unknown): string {
  if (isNil(value) || value === false) {
    return ''
  }

  return normalizeClass(value)
}

/**
 * 将 `class` 相关入参归一化为以空格分隔的字符串。
 *
 * @param value - 传入的 class 值
 * @returns 拼接后的类名字符串
 */
function normalizeClass(value: unknown): string {
  const tokens: string[] = []

  collectClassTokens(value, tokens)

  /* 将所有合法标记用空格连接，并去除首尾空白，确保最终类名紧凑。 */
  return tokens.join(' ').trim()
}

/**
 * 递归收集 `class` 值中的有效标记，支持字符串、数组与对象形式。
 *
 * @param source - 原始 class 值
 * @param tokens - 收集到的类名列表
 */
function collectClassTokens(source: unknown, tokens: string[]): void {
  /* 空值直接跳过，不参与渲染。 */
  if (isNil(source)) {
    return
  }

  /* 字符串仅保留非空值，避免插入多余空格。 */
  if (typeof source === 'string') {
    if (source.length > 0) {
      tokens.push(source)
    }

    return
  }

  /* 数组按顺序展开，确保嵌套结构被完全遍历。 */
  if (Array.isArray(source)) {
    for (const item of source) {
      collectClassTokens(item, tokens)
    }

    return
  }

  /* 对象形式以键为类名，truthy 的键值才会被加入。 */
  if (isObject(source)) {
    for (const [name, active] of Object.entries(source as Record<string, unknown>)) {
      if (active) {
        tokens.push(name)
      }
    }
  }
}
