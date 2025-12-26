/**
 * LIS 算法可视化 - 追踪函数模块。
 *
 * @remarks
 * 本模块实现 LIS（最长递增子序列）算法的追踪功能，记录算法执行的每一步状态，
 * 供可视化组件逐步展示算法执行过程。
 */

import type { StepAction, TraceResult, VisualizationStep } from './types'

/**
 * 追踪 LIS 算法执行过程，返回完整的可视化数据。
 *
 * @remarks
 * 该函数是可视化模块的核心入口，它执行 LIS 算法并记录每一步的状态快照。
 * 算法采用「贪心 + 二分查找」策略：
 * - 维护一个递增序列 `sequence`，存储当前最优的递增子序列索引
 * - 维护一个前驱数组 `predecessors`，记录每个元素在 LIS 中的前驱
 * - 遍历输入数组，对每个元素决定追加、替换或跳过
 *
 * @param indexes - 输入数组（新偏移 -> 旧索引映射）
 * @returns 包含所有步骤和最终结果的追踪数据
 */
export function traceLongestIncreasingSubsequence(indexes: number[]): TraceResult {
  /* 收集所有可视化步骤 */
  const steps: VisualizationStep[] = []

  /* 递增序列的索引列表，存储输入数组中的索引而非值 */
  const sequence: number[] = []

  /* 前驱数组，predecessors[i] 表示索引 i 在 LIS 中的前驱索引，-1 代表无前驱 */
  const predecessors = Array.from<number>({ length: indexes.length }).fill(-1)

  /* 第 0 步：记录初始状态，此时尚未处理任何元素 */
  steps.push({
    stepIndex: 0,
    currentIndex: -1,
    currentValue: -1,
    action: { type: 'init' },
    sequence: [],
    predecessors: [...predecessors],
  })

  /* 逐项遍历输入数组，记录每一步的状态变化 */
  for (let currentIndex = 0; currentIndex < indexes.length; currentIndex += 1) {
    const currentValue = indexes[currentIndex]

    /* 确定本次迭代的操作类型，并更新 sequence 和 predecessors */
    const action = determineAction({ indexes, currentIndex, currentValue }, sequence, predecessors)

    /* 记录当前步骤的快照，深拷贝 sequence 和 predecessors 以保留历史状态 */
    steps.push({
      stepIndex: currentIndex + 1,
      currentIndex,
      currentValue,
      action,
      sequence: [...sequence],
      predecessors: [...predecessors],
    })
  }

  /* 根据最终状态回溯出完整的递增子序列索引 */
  const result = traceSequenceResult(sequence, predecessors)

  return {
    input: indexes,
    steps,
    result,
  }
}

/**
 * 确定操作类型时所需的上下文信息。
 */
interface DetermineActionContext {
  /** 输入数组 */
  indexes: number[]
  /** 当前处理的索引 */
  currentIndex: number
  /** 当前索引对应的值 */
  currentValue: number
}

/**
 * 确定当前迭代的操作类型，并更新序列和前驱数组。
 *
 * @remarks
 * 根据当前值与序列尾部的比较结果，决定执行以下操作之一：
 * - `skip`：当前值为 -1（占位符），跳过不处理
 * - `append`：当前值大于序列尾部，追加到序列末尾
 * - `replace`：当前值不大于序列尾部，用二分查找找到合适位置替换
 *
 * @param context - 当前迭代上下文
 * @param sequence - 当前递增序列（会被修改）
 * @param predecessors - 前驱数组（会被修改）
 * @returns 本次迭代的操作类型
 */
function determineAction(
  context: DetermineActionContext,
  sequence: number[],
  predecessors: number[],
): StepAction {
  const { indexes, currentIndex, currentValue } = context

  /* 忽略标记为缺失的占位符（-1 表示该位置无有效元素） */
  if (currentValue === -1) {
    return { type: 'skip', index: currentIndex }
  }

  /* 获取当前递增序列的末尾索引 */
  const lastSequenceIndex = sequence.at(-1)

  /* 获取序列尾部对应的值，用于与当前值比较 */
  let lastSequenceValue: number | undefined

  if (lastSequenceIndex !== undefined) {
    lastSequenceValue = indexes[lastSequenceIndex]
  }

  /* 序列为空或当前值严格递增：直接追加到尾部 */
  if (lastSequenceValue === undefined || currentValue > lastSequenceValue) {
    /* 记录前驱：当前元素的前驱是序列的最后一个元素 */
    predecessors[currentIndex] = lastSequenceIndex ?? -1
    /* 追加到序列末尾 */
    sequence.push(currentIndex)

    return { type: 'append', index: currentIndex }
  }

  /* 当前值不大于序列尾部，需要在序列中找到合适的替换位置 */
  const insertPosition = findInsertPosition(sequence, indexes, currentValue)
  const replaceIndex = sequence[insertPosition]
  const replaceValue = indexes[replaceIndex]

  /* 仅当当前值更优（更小）时才替换，保持序列尾部尽可能小 */
  if (currentValue < replaceValue) {
    /* 记录前驱：当前元素的前驱是替换位置的前一个元素 */
    predecessors[currentIndex] = insertPosition > 0 ? sequence[insertPosition - 1] : -1
    /* 替换序列中的位置 */
    sequence[insertPosition] = currentIndex

    return { type: 'replace', position: insertPosition, index: currentIndex }
  }

  /* 值相等时不替换，视为跳过 */
  return { type: 'skip', index: currentIndex }
}

/**
 * 在当前递增序列中查找目标值的插入位置（下界二分查找）。
 *
 * @remarks
 * 使用二分查找在 `sequence` 对应的值中找到第一个大于等于 `target` 的位置。
 * 这是 LIS 算法的关键优化，将时间复杂度从 O(n²) 降低到 O(n log n)。
 *
 * @param sequence - 当前递增序列的索引列表
 * @param indexes - 输入数组，用于获取索引对应的实际值
 * @param target - 目标值
 * @returns 第一个值大于等于 target 的位置索引
 */
function findInsertPosition(sequence: number[], indexes: number[], target: number): number {
  let low = 0
  let high = sequence.length - 1

  /* 标准下界二分查找 */
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    const middleIndex = sequence[middle]

    if (indexes[middleIndex] < target) {
      low = middle + 1
    } else {
      high = middle
    }
  }

  return low
}

/**
 * 从序列尾部回溯前驱链，生成完整的递增子序列索引列表。
 *
 * @remarks
 * 由于 `sequence` 数组在算法执行过程中会被替换操作修改，
 * 它只保存了每个长度的最优尾部索引，而非完整的 LIS。
 * 需要通过 `predecessors` 数组从尾部向前回溯，才能得到真正的 LIS。
 *
 * @param sequence - 递增序列的索引列表（仅用于获取尾部起点）
 * @param predecessors - 前驱数组
 * @returns 完整的递增子序列索引，按递增顺序排列
 */
function traceSequenceResult(sequence: number[], predecessors: number[]): number[] {
  const result: number[] = []

  /* 从序列尾部开始回溯 */
  let tailIndex = sequence.at(-1) ?? -1

  /* 沿前驱链向前遍历，直到遇到 -1（无前驱） */
  while (tailIndex >= 0) {
    result.push(tailIndex)
    tailIndex = predecessors[tailIndex]
  }

  /* 回溯得到的是逆序，需要反转为正序 */
  return result.reverse()
}
