/**
 * 输入处理工具函数
 *
 * 提供 LIS 算法可视化中输入解析、去重、归一化和随机生成相关的纯函数。
 * 这些函数用于处理用户输入的数字序列，确保输入符合 LIS 算法的要求。
 */

/**
 * 解析结果类型。
 *
 * 使用联合类型区分成功和失败两种情况，便于调用方进行类型安全的错误处理。
 */
export type ParseResult = { success: true; data: number[] } | { success: false; error: string }

/**
 * 去重处理：保留第一次出现的值，后续重复的替换为 -1。
 *
 * @remarks
 * -1 是特殊占位符，表示"新节点"，不参与去重逻辑。
 * 这种设计符合真实 diff 场景中新旧节点的处理方式。
 *
 * @param numbers - 输入数组
 * @returns 去重后的数组
 *
 * @example
 * ```ts
 * deduplicateInput([1, 2, 1, 3, 2]) // => [1, 2, -1, 3, -1]
 * deduplicateInput([-1, 1, -1, 1]) // => [-1, 1, -1, -1]
 * ```
 */
export function deduplicateInput(numbers: number[]): number[] {
  const seen = new Set<number>()
  const result: number[] = []

  for (const number_ of numbers) {
    /* -1 是占位符，不参与去重 */
    if (number_ === -1) {
      result.push(-1)
      continue
    }

    if (seen.has(number_)) {
      /* 重复值替换为 -1 */
      result.push(-1)
    } else {
      seen.add(number_)
      result.push(number_)
    }
  }

  return result
}

/**
 * 解析输入字符串为数字数组。
 *
 * @remarks
 * 支持逗号或空格分隔的数字字符串。
 * 验证规则：
 * - 只允许 -1 和非负整数
 * - 不支持小数
 * - 自动去重（重复值替换为 -1）
 *
 * @param value - 输入字符串
 * @returns 解析结果，成功时包含数字数组，失败时包含错误信息
 *
 * @example
 * ```ts
 * parseInput('1, 2, 3') // => { success: true, data: [1, 2, 3] }
 * parseInput('1 2 3')   // => { success: true, data: [1, 2, 3] }
 * parseInput('abc')     // => { success: false, error: '无效的数字: "abc"' }
 * ```
 */
export function parseInput(value: string): ParseResult {
  const trimmed = value.trim()

  if (!trimmed) {
    return { success: true, data: [] }
  }

  /* 支持逗号或空格分隔 */
  const parts = trimmed.split(/[,\s]+/).filter(Boolean)
  const numbers: number[] = []

  for (const part of parts) {
    const number_ = Number(part)

    if (Number.isNaN(number_)) {
      return { success: false, error: `无效的数字: "${part}"` }
    }

    /* 只允许 -1 和非负整数 */
    if (number_ < -1) {
      return { success: false, error: `不支持的负数: "${part}"（仅支持 -1 表示新节点）` }
    }

    if (!Number.isInteger(number_)) {
      return { success: false, error: `不支持小数: "${part}"` }
    }

    numbers.push(number_)
  }

  /* 去重：重复值替换为 -1，符合真实 diff 场景 */
  return { success: true, data: deduplicateInput(numbers) }
}

/**
 * 归一化数组：将非 -1 的值按大小顺序映射为 0, 1, 2, ...
 *
 * @remarks
 * 归一化后的数组保持原有的相对大小关系，但值域变为连续的非负整数。
 * 这种处理简化了 LIS 算法的可视化展示。
 *
 * @param numbers - 输入数组
 * @returns 归一化后的数组
 *
 * @example
 * ```ts
 * normalizeSequence([10, 5, 20]) // => [1, 0, 2]
 * normalizeSequence([10, -1, 5]) // => [1, -1, 0]
 * ```
 */
export function normalizeSequence(numbers: number[]): number[] {
  /* 提取非 -1 的值并排序 */
  const nonNegativeOnes = numbers.filter((n) => {
    return n !== -1
  })
  const sorted = [...nonNegativeOnes].sort((a, b) => {
    return a - b
  })

  /* 建立值到归一化索引的映射 */
  const valueToIndex = new Map<number, number>()

  for (const [index, value] of sorted.entries()) {
    valueToIndex.set(value, index)
  }

  /* 替换原数组中的值 */
  return numbers.map((n) => {
    return n === -1 ? -1 : valueToIndex.get(n)!
  })
}

/**
 * 生成随机数字序列（无重复值，已归一化）。
 *
 * @remarks
 * 生成长度为 8-15 的随机序列，约 10% 的位置为 -1（表示新节点）。
 * 生成的序列已经过归一化处理，值域为连续的非负整数。
 *
 * @returns 随机归一化序列
 *
 * @example
 * ```ts
 * generateRandomSequence() // => [3, 1, -1, 0, 4, 2, ...]
 * ```
 */
export function generateRandomSequence(): number[] {
  /* 随机长度 8-15 */
  const length = Math.floor(Math.random() * 8) + 8
  const result: number[] = []
  const used = new Set<number>()

  for (let i = 0; i < length; i++) {
    /* 随机决定是否生成 -1（约 10% 概率） */
    if (Math.random() < 0.1) {
      result.push(-1)
    } else {
      /* 生成不重复的 0-50 随机数 */
      let number_: number

      do {
        number_ = Math.floor(Math.random() * 51)
      } while (used.has(number_))

      used.add(number_)
      result.push(number_)
    }
  }

  /* 归一化：将值映射为 0, 1, 2, ... */
  return normalizeSequence(result)
}
