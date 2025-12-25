/**
 * 计算数组的最长递增子序列（Longest Increasing Subsequence），返回元素所在的索引列表。
 *
 * @remarks
 * - 输入是「新偏移 -> 旧索引」的映射数组，`-1` 表示未复用节点。
 * - 使用「贪心 + 二分」维护每个长度的最小可能尾值，避免 O(n²) 的 DP。
 * - 返回值是偏移量列表（索引），供外层据此判定哪些节点可以跳过移动。
 * - 时间复杂度 O(n log n)，空间复杂度 O(n)。
 *
 * @example
 * ```ts
 * // 输入 [3, 1, 4, 1, 5, 9, 2, 6]
 * // 返回 [1, 2, 4, 7]（对应值 1, 4, 5, 6）
 * ```
 */
export function computeLongestIncreasingSubsequence(indexes: number[]): number[] {
  /* 为即将构建的序列准备初始状态，长度与输入一致。 */
  const state = createSequenceState(indexes.length)

  /* 扫描输入列表，构建最优序列的索引与前驱关系。 */
  buildIncreasingSequence(indexes, state)

  /* 根据构建好的状态回溯出完整的递增子序列索引。 */
  return traceSequence(state)
}

/**
 * LIS 计算过程中的中间状态，保存当前序列与前驱关系。
 *
 * @remarks
 * - `sequence`：递增序列的索引列表，每个位置存储该长度序列的最小尾部索引。
 * - `predecessors`：每个索引的前驱位置，用于回溯完整序列。
 */
interface LongestIncreasingSubsequenceState {
  /** 递增序列的索引列表。 */
  sequence: number[]
  /** 每个索引的前驱位置（-1 代表无前驱）。 */
  predecessors: number[]
}

/**
 * 初始化 LIS 状态，预填充前驱数组。
 *
 * @remarks
 * - 序列初始为空，等待扫描过程中逐步填充。
 * - 前驱数组按输入长度填充为 `-1`，表示默认无前驱。
 */
function createSequenceState(length: number): LongestIncreasingSubsequenceState {
  /* 序列初始为空，等待扫描过程中逐步填充。 */
  const sequence: number[] = []
  /* 前驱数组按输入长度填充为 -1，表示默认无前驱。 */
  const predecessors = Array.from({ length }, () => {
    return -1
  })

  /* 返回包含序列与前驱的状态对象。 */
  return {
    sequence,
    predecessors,
  }
}

/**
 * 扫描输入列表，按递增子序列规则构建序列与前驱映射。
 *
 * @remarks
 * - 遇到哨兵 -1 直接跳过，保持“未匹配”语义。
 * - 比当前序列尾部更大的值直接追加，否则通过二分找到替换位。
 * - `sequence` 中仅存放索引，保证与输入扫描顺序一致；实际子序列在回溯时恢复。
 */
function buildIncreasingSequence(
  indexes: number[],
  state: LongestIncreasingSubsequenceState,
): void {
  /* 逐项遍历输入数组，尝试扩展或优化当前递增序列。 */
  for (let currentIndex = 0; currentIndex < indexes.length; currentIndex += 1) {
    /* 当前扫描到的新偏移对应的旧索引值。 */
    const currentValue = indexes[currentIndex]

    /* 忽略标记为缺失的占位符，避免影响序列单调性。 */
    if (currentValue === -1) {
      continue
    }

    /* 当前递增序列的末尾索引，undefined 表示序列为空。 */
    const lastSequenceIndex = state.sequence.at(-1)
    /* 序列尾部对应的旧索引值，后续与当前值比较大小。 */
    let lastSequenceValue: number | undefined

    /* 如果存在尾部索引，则读取对应的旧索引值。 */
    if (lastSequenceIndex !== undefined) {
      lastSequenceValue = indexes[lastSequenceIndex]
    }

    /* 序列为空或当前值递增：直接把当前索引追加到尾部。 */
    if (lastSequenceValue === undefined || currentValue > lastSequenceValue) {
      /* 默认前驱为 -1，表示没有前驱。 */
      let previousIndex = -1

      /* 如果序列已有尾部，则将尾部作为当前节点的前驱。 */
      if (lastSequenceIndex !== undefined) {
        previousIndex = lastSequenceIndex
      }

      /* 记录当前索引的前驱，形成回溯链。 */
      state.predecessors[currentIndex] = previousIndex
      /* 将当前索引追加到递增序列的末尾。 */
      state.sequence.push(currentIndex)
      /* 本次迭代已处理完成，继续扫描下一个元素。 */
      continue
    }

    /* 否则需要在已有序列中找到合适的替换位置。 */
    const insertPosition = findInsertPosition(state.sequence, indexes, currentValue)
    /* 读取待替换的序列索引，用于计算当前尾部值。 */
    const replaceIndex = state.sequence[insertPosition]
    /* 读取待替换位置的旧索引值，作为比较基准。 */
    const replaceValue = indexes[replaceIndex]

    /*
     * 仅当当前值更优（更小的尾部）时才替换：
     * - 保持同长度序列的最小尾值。
     * - 让后续元素有更大机会继续递增。
     */
    if (currentValue < replaceValue) {
      let previousIndex = -1

      /* 若插入位不在开头，则前驱为插入位前一个元素。 */
      if (insertPosition > 0) {
        previousIndex = state.sequence[insertPosition - 1]
      }

      /* 写入当前索引的前驱，保持回溯链连续。 */
      state.predecessors[currentIndex] = previousIndex
      /* 用当前索引替换原有尾部，保持该长度最小尾值。 */
      state.sequence[insertPosition] = currentIndex
    }
  }
}

/**
 * 在当前递增序列中找到 `target` 的插入位置（下界）。
 *
 * @remarks
 * - 输入 `sequence` 存的是索引列表，`indexes` 提供真实值。
 * - 返回第一个值大于等于 `target` 的位置，用于替换或追加。
 */
function findInsertPosition(sequence: number[], indexes: number[], target: number): number {
  /* 初始化二分的左右边界，覆盖整个序列。 */
  let low = 0
  let high = sequence.length - 1

  /* 标准二分：收敛到第一个大于等于 target 的位置。 */
  while (low < high) {
    /* 取中点索引，避免溢出的常规写法。 */
    const middle = Math.floor((low + high) / 2)
    /* 将中点索引映射回输入数组的真实值。 */
    const middleIndex = sequence[middle]

    /* 根据中点值与目标值比较，收缩边界。 */
    if (indexes[middleIndex] < target) {
      /* 中点值偏小：抬高下界到中点右侧。 */
      low = middle + 1
    } else {
      /* 中点值足够大：收缩上界到中点。 */
      high = middle
    }
  }

  /* 返回收敛后的下界位置，用于替换或追加。 */
  return low
}

/**
 * 根据序列尾部开始回溯前驱，生成完整的递增索引列表。
 *
 * @remarks
 * - `sequence` 只保存了各长度的最佳尾部索引，需结合 `predecessors` 还原完整链。
 * - 回溯时从最后一个尾部开始沿前驱向前收集，再反转保证输出从头到尾递增。
 */
function traceSequence(state: LongestIncreasingSubsequenceState): number[] {
  /* 用于收集回溯得到的索引链。 */
  const result: number[] = []
  /* 从当前最优序列的尾部开始回溯，可能不存在。 */
  let tailIndex = -1
  /* 当前最优序列的尾部索引，用于确定回溯起点。 */
  const sequenceTail = state.sequence.at(-1)

  /* 若序列尾部存在有效索引，则从该索引开始回溯。 */
  if (sequenceTail !== undefined) {
    tailIndex = sequenceTail
  }

  /* 反向沿前驱链回溯，再翻转得到从头到尾的递增序列。 */
  while (tailIndex >= 0) {
    /* 收集当前尾部索引。 */
    result.push(tailIndex)
    /* 沿着前驱指针跳向上一个元素。 */
    tailIndex = state.predecessors[tailIndex]
  }

  /* 反转回溯顺序，得到正向的递增序列。 */
  return result.reverse()
}
