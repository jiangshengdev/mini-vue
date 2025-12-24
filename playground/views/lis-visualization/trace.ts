/**
 * LIS 算法可视化 - 追踪函数
 */

import type { StepAction, TraceResult, VisualizationStep } from './types'

/**
 * 追踪 LIS 算法执行过程，返回完整的可视化数据。
 *
 * @param indexes - 输入数组（新偏移 -> 旧索引映射）
 * @returns 包含所有步骤和最终结果的追踪数据
 */
export function traceLongestIncreasingSubsequence(indexes: number[]): TraceResult {
  /* 收集所有可视化步骤 */
  const steps: VisualizationStep[] = []

  /* 递增序列的索引列表 */
  const sequence: number[] = []

  /* 每个索引的前驱位置（-1 代表无前驱） */
  const predecessors = Array.from<number>({ length: indexes.length }).fill(-1)

  /* 第 0 步：记录初始状态 */
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

    /* 确定本次迭代的操作类型 */
    const action = determineAction({ indexes, currentIndex, currentValue }, sequence, predecessors)

    /* 记录当前步骤的快照（深拷贝 sequence 和 predecessors） */
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
 * 确定当前迭代的操作类型，并更新序列和前驱数组。
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

  /* 忽略标记为缺失的占位符 */
  if (currentValue === -1) {
    return { type: 'skip', index: currentIndex }
  }

  /* 当前递增序列的末尾索引 */
  const lastSequenceIndex = sequence.at(-1)

  /* 序列尾部对应的旧索引值 */
  let lastSequenceValue: number | undefined

  if (lastSequenceIndex !== undefined) {
    lastSequenceValue = indexes[lastSequenceIndex]
  }

  /* 序列为空或当前值递增：直接追加到尾部 */
  if (lastSequenceValue === undefined || currentValue > lastSequenceValue) {
    /* 记录前驱 */
    predecessors[currentIndex] = lastSequenceIndex ?? -1
    /* 追加到序列末尾 */
    sequence.push(currentIndex)

    return { type: 'append', index: currentIndex }
  }

  /* 否则需要在已有序列中找到合适的替换位置 */
  const insertPosition = findInsertPosition(sequence, indexes, currentValue)
  const replaceIndex = sequence[insertPosition]
  const replaceValue = indexes[replaceIndex]

  /* 仅当当前值更优（更小的尾部）时才替换 */
  if (currentValue < replaceValue) {
    /* 记录前驱 */
    predecessors[currentIndex] = insertPosition > 0 ? sequence[insertPosition - 1] : -1
    /* 替换序列中的位置 */
    sequence[insertPosition] = currentIndex

    return { type: 'replace', position: insertPosition, index: currentIndex }
  }

  /* 值相等时不替换，视为跳过 */

  return { type: 'skip', index: currentIndex }
}

/**
 * 在当前递增序列中找到 target 的插入位置（下界）。
 *
 * @param sequence - 当前递增序列的索引列表
 * @param indexes - 输入数组
 * @param target - 目标值
 * @returns 第一个值大于等于 target 的位置
 */
function findInsertPosition(sequence: number[], indexes: number[], target: number): number {
  let low = 0
  let high = sequence.length - 1

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
 * 根据序列尾部开始回溯前驱，生成完整的递增索引列表。
 *
 * @param sequence - 递增序列的索引列表
 * @param predecessors - 前驱数组
 * @returns 完整的递增子序列索引
 */
function traceSequenceResult(sequence: number[], predecessors: number[]): number[] {
  const result: number[] = []
  let tailIndex = sequence.at(-1) ?? -1

  while (tailIndex >= 0) {
    result.push(tailIndex)
    tailIndex = predecessors[tailIndex]
  }

  return result.reverse()
}
