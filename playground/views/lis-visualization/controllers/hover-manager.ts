/**
 * LIS 可视化 - Hover 管理器
 *
 * 处理链高亮和区域 hover 状态。
 *
 * @remarks
 * - 管理用户鼠标悬停时的视觉反馈，包括链高亮和区域高亮。
 * - 链高亮：当用户悬停在某条链上时，高亮显示该链经过的所有索引。
 * - 区域高亮：当用户悬停在序列区或前驱区时，标记对应区域的 hover 状态。
 */

import type { HoverManager, HoverManagerDeps } from '../types.ts'

/**
 * 创建 Hover 管理器，处理所有 hover 相关的状态更新。
 *
 * @remarks
 * - 依赖 `stateManager` 读写 hover 状态。
 * - 依赖 `getCurrentStep` 获取当前步骤数据，用于刷新链索引。
 *
 * @param deps - 依赖项
 * @returns Hover 管理器实例
 */
export function createHoverManager(deps: HoverManagerDeps): HoverManager {
  const { stateManager, getCurrentStep } = deps
  const state = stateManager.getState()

  return {
    /**
     * 处理链 hover 进入事件，记录链信息并高亮对应索引。
     *
     * @param indexes - 该链经过的所有索引
     * @param chainIndex - 链在序列中的位置索引
     */
    handleChainHover(indexes: number[], chainIndex: number): void {
      state.hoveredChainInfo.set({ chainIndex })
      state.hoveredChainIndexes.set(indexes)
    },

    /** 处理链 hover 离开事件，清空链高亮状态。 */
    handleChainLeave(): void {
      state.hoveredChainInfo.set(undefined)
      state.hoveredChainIndexes.set([])
    },

    /** 处理序列区域 hover 进入事件。 */
    handleSequenceHover(): void {
      state.isSequenceHovered.set(true)
    },

    /** 处理序列区域 hover 离开事件。 */
    handleSequenceLeave(): void {
      state.isSequenceHovered.set(false)
    },

    /** 处理前驱区域 hover 进入事件。 */
    handlePredecessorsHover(): void {
      state.isPredecessorsHovered.set(true)
    },

    /** 处理前驱区域 hover 离开事件。 */
    handlePredecessorsLeave(): void {
      state.isPredecessorsHovered.set(false)
    },

    /**
     * 刷新 hover 状态，在步骤变化后重新计算链索引。
     *
     * @remarks
     * - 当用户导航到新步骤时，需要根据新步骤的数据重新构建链索引。
     * - 如果当前没有链 hover 或步骤不存在，保持或清空状态。
     * - 从 `sequence[chainIndex]` 开始，沿 `predecessors` 回溯构建完整链。
     */
    refreshHoverState(): void {
      const currentStep = getCurrentStep()
      const chainInfo = state.hoveredChainInfo.get()

      /* 如果当前没有链 hover，保持现状。 */
      if (!chainInfo) {
        return
      }

      /* 如果当前步骤不存在，清空 hover 状态。 */
      if (!currentStep) {
        state.hoveredChainIndexes.set([])
        state.hoveredChainInfo.set(undefined)

        return
      }

      /* 重新构建当前步骤下对应链的索引列表。 */
      const { sequence, predecessors } = currentStep
      const { chainIndex } = chainInfo

      /* 如果 chainIndex 超出范围，清空 hover 状态。 */
      if (chainIndex < 0 || chainIndex >= sequence.length) {
        state.hoveredChainIndexes.set([])
        state.hoveredChainInfo.set(undefined)

        return
      }

      /* 从 sequence[chainIndex] 开始，沿 predecessors 回溯构建链。 */
      const chain: number[] = []
      let current = sequence[chainIndex]

      while (current >= 0) {
        chain.unshift(current)
        current = predecessors[current]
      }

      state.hoveredChainIndexes.set(chain)
    },
  }
}
