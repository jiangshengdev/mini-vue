import { isNil, isObject } from '@/shared/index.ts'

/**
 * 将 class 相关入参归一化为以空格分隔的字符串。
 */
export function normalizeClass(value: unknown): string {
  const tokens: string[] = []

  collectClassTokens(value, tokens)

  return tokens.join(' ').trim()
}

/**
 * 递归收集 class 值中的有效标记，支持字符串、数组与对象形式。
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
