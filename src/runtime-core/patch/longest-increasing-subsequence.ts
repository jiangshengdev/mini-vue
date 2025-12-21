/**
 * 计算数组的最长递增子序列（Longest Increasing Subsequence），返回元素所在的索引列表。
 *
 * @remarks
 * - 仅考虑值非 0 的位置，0 作为缺失哨兵会被跳过。
 * - 时间复杂度 O(n log n)，空间复杂度 O(n)。
 */
export function computeLongestIncreasingSubsequence(indexes: number[]): number[] {
  const state = createSequenceState(indexes.length)

  buildIncreasingSequence(indexes, state)

  return traceSequence(state)
}

/** LIS 计算过程中的中间状态，保存当前序列与前驱关系。 */
interface LongestIncreasingSubsequenceState {
  /** 递增序列的索引列表。 */
  sequence: number[]
  /** 每个索引的前驱位置（-1 代表无前驱）。 */
  predecessors: number[]
}

/** 初始化 LIS 状态，预填充前驱数组。 */
function createSequenceState(length: number): LongestIncreasingSubsequenceState {
  return {
    sequence: [],
    predecessors: Array.from({ length }, () => {
      return -1
    }),
  }
}

/**
 * 扫描输入列表，按递增子序列规则构建序列与前驱映射。
 *
 * @remarks
 * - 遇到哨兵 0 直接跳过，保持“未匹配”语义。
 * - 比当前序列尾部更大的值直接追加，否则通过二分找到替换位。
 */
function buildIncreasingSequence(
  indexes: number[],
  state: LongestIncreasingSubsequenceState,
): void {
  for (let currentIndex = 0; currentIndex < indexes.length; currentIndex += 1) {
    const currentValue = indexes[currentIndex]

    /* 忽略标记为缺失的占位符，避免影响序列单调性。 */
    if (currentValue === 0) {
      continue
    }

    const lastSequenceIndex = state.sequence.at(-1)

    /* 比尾部更大：直接拓展序列长度，并记录前驱。 */
    if (lastSequenceIndex === undefined || currentValue > indexes[lastSequenceIndex]) {
      state.predecessors[currentIndex] = lastSequenceIndex ?? -1
      state.sequence.push(currentIndex)
      continue
    }

    /* 使用二分查找找到应该替换的位置，使序列保持单调最小。 */
    const insertPosition = findInsertPosition(state.sequence, indexes, currentValue)
    const replaceIndex = state.sequence[insertPosition]

    /* 仅在当前位置值更大时才替换，并维护前驱指向。 */
    if (currentValue < indexes[replaceIndex]) {
      state.predecessors[currentIndex] =
        insertPosition > 0 ? state.sequence[insertPosition - 1] : -1
      state.sequence[insertPosition] = currentIndex
    }
  }
}

/** 在当前递增序列中找到 `target` 的插入位置（下界）。 */
function findInsertPosition(sequence: number[], indexes: number[], target: number): number {
  let low = 0
  let high = sequence.length - 1

  /* 标准二分：收敛到第一个大于等于 target 的位置。 */
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

/** 根据序列尾部开始回溯前驱，生成完整的递增索引列表。 */
function traceSequence(state: LongestIncreasingSubsequenceState): number[] {
  const result: number[] = []
  let tailIndex = state.sequence.at(-1) ?? -1

  /* 反向沿前驱链回溯，再翻转得到从头到尾的递增序列。 */
  while (tailIndex >= 0) {
    result.push(tailIndex)
    tailIndex = state.predecessors[tailIndex]
  }

  return result.reverse()
}
