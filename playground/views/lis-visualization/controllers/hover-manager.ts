/**
 * LIS 可视化 - Hover 管理器
 *
 * 处理链高亮和区域 hover 状态
 */

import type { HoverManager, HoverManagerDeps } from '../types.ts'

/**
 * 创建 Hover 管理器
 *
 * @param deps - 依赖项
 * @returns Hover 管理器实例
 */
export function createHoverManager(deps: HoverManagerDeps): HoverManager {
  const { stateManager, getCurrentStep } = deps
  const state = stateManager.getState()

  return {
    handleChainHover(indexes: number[], chainIndex: number): void {
      state.hoveredChainInfo.set({ chainIndex })
      state.hoveredChainIndexes.set(indexes)
    },

    handleChainLeave(): void {
      state.hoveredChainInfo.set(undefined)
      state.hoveredChainIndexes.set([])
    },

    handleSequenceHover(): void {
      state.isSequenceHovered.set(true)
    },

    handleSequenceLeave(): void {
      state.isSequenceHovered.set(false)
    },

    handlePredecessorsHover(): void {
      state.isPredecessorsHovered.set(true)
    },

    handlePredecessorsLeave(): void {
      state.isPredecessorsHovered.set(false)
    },

    refreshHoverState(): void {
      const currentStep = getCurrentStep()
      const chainInfo = state.hoveredChainInfo.get()

      // 如果当前没有链 hover，保持现状
      if (!chainInfo) {
        return
      }

      // 如果当前步骤不存在，清空 hover 状态
      if (!currentStep) {
        state.hoveredChainIndexes.set([])
        state.hoveredChainInfo.set(undefined)

        return
      }

      // 重新构建当前步骤下对应链的索引列表
      const { sequence, predecessors } = currentStep
      const { chainIndex } = chainInfo

      // 如果 chainIndex 超出范围，清空 hover 状态
      if (chainIndex < 0 || chainIndex >= sequence.length) {
        state.hoveredChainIndexes.set([])
        state.hoveredChainInfo.set(undefined)

        return
      }

      // 从 sequence[chainIndex] 开始，沿 predecessors 回溯构建链
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
