/**
 * Chain 构建工具函数
 *
 * 提供 LIS 算法可视化中链构建相关的纯函数。
 * 链（Chain）是 LIS 算法中的核心概念，表示从某个元素沿前驱指针回溯到根的路径。
 */

/**
 * 从指定索引构建完整的前驱链。
 *
 * @remarks
 * 从 `startIndex` 开始，沿着 `predecessors` 数组向前追溯，
 * 直到遇到 -1（表示无前驱，即根节点）为止。
 * 内部使用 `visited` 集合检测循环，防止异常数据导致无限循环。
 *
 * @param startIndex - 起始索引
 * @param predecessors - 前驱数组，`predecessors[i]` 表示索引 `i` 的前驱索引，-1 表示无前驱
 * @returns 从根到 `startIndex` 的完整链（索引数组）
 *
 * @example
 * ```ts
 * // predecessors: [−1, 0, 1, 2]
 * // 表示: 0 无前驱, 1 的前驱是 0, 2 的前驱是 1, 3 的前驱是 2
 * buildChain(3, [-1, 0, 1, 2]) // => [0, 1, 2, 3]
 * ```
 */
export function buildChain(startIndex: number, predecessors: number[]): number[] {
  /* 边界检查：无效索引返回空数组 */
  if (startIndex < 0 || startIndex >= predecessors.length) {
    return []
  }

  const chain: number[] = []
  let current = startIndex
  const visited = new Set<number>()

  /* 沿前驱链向前追溯，直到遇到 -1 或检测到循环 */
  while (current >= 0) {
    /* 循环检测：避免无限循环 */
    if (visited.has(current)) {
      break
    }

    visited.add(current)
    chain.unshift(current)
    current = predecessors[current]
  }

  return chain
}

/**
 * 为 sequence 中的每个元素构建前驱链。
 *
 * @remarks
 * 遍历 sequence 数组，为每个索引调用 `buildChain` 构建完整的前驱链。
 * 返回的链数组与 sequence 数组一一对应。
 *
 * @param sequence - 当前 sequence 数组，存储的是索引
 * @param predecessors - 前驱数组
 * @returns 所有链的数组，`chains[i]` 对应 `sequence[i]` 的完整前驱链
 *
 * @example
 * ```ts
 * buildAllChains([0, 2], [-1, 0, 1])
 * // => [[0], [0, 1, 2]]
 * ```
 */
export function buildAllChains(sequence: number[], predecessors: number[]): number[][] {
  return sequence.map((index) => {
    return buildChain(index, predecessors)
  })
}

/**
 * 计算两个链集合之间的变更节点。
 *
 * @remarks
 * 比较当前链集合与上一步链集合，找出每条链中发生变化的节点。
 * 用于在可视化中高亮显示变更的节点，帮助用户理解算法执行过程。
 *
 * 变更检测逻辑：
 * 1. 如果有上一步链，逐位置比较两条链的节点差异
 * 2. 如果无上一步链但是链操作（append/replace），整条链都标记为新增
 *
 * @param chains - 当前链集合
 * @param previousChains - 上一步链集合（可选）
 * @param isChainAction - 是否为链操作（append/replace）
 * @param highlightPredIndex - 高亮前驱索引
 * @returns 每条链的变更节点集合，`Map<chainIndex, Set<nodeIndex>>`
 */
export function computeChangedNodesByChain(
  chains: number[][],
  previousChains: number[][] | undefined,
  isChainAction: boolean,
  highlightPredIndex: number,
): Map<number, Set<number>> {
  const changed = new Map<number, Set<number>>()

  for (const [chainIndex, chain] of chains.entries()) {
    const previousChain = previousChains?.[chainIndex]
    const nodeSet = new Set<number>()

    if (previousChain) {
      /* 有上一步链：比较两条链的差异 */
      const maxLength = Math.max(chain.length, previousChain.length)

      for (let i = 0; i < maxLength; i += 1) {
        const currentNode = chain[i]
        const previousNode = previousChain[i]

        if (currentNode !== previousNode && currentNode !== undefined) {
          nodeSet.add(currentNode)
        }
      }
    } else if (isChainAction && highlightPredIndex >= 0 && chain.includes(highlightPredIndex)) {
      /* 无上一步链但是链操作：整条链都是新增的 */
      for (const node of chain) {
        nodeSet.add(node)
      }
    }

    if (nodeSet.size > 0) {
      changed.set(chainIndex, nodeSet)
    }
  }

  return changed
}
