/**
 * LIS 可视化 - 状态管理器
 *
 * 集中管理所有响应式状态，提供统一的访问和修改接口。
 *
 * @remarks
 * - 状态管理器是可视化模块的核心，所有 UI 组件通过它读取和修改状态。
 * - 内部使用 mini-vue 的 `state` 实现响应式，确保状态变更自动触发视图更新。
 */

import type { StateManager, VisualizationState } from '../types.ts'
import { state } from '@/index.ts'

/** 默认播放速度（毫秒），控制自动播放时每步之间的间隔。 */
const defaultSpeed = 500

/**
 * 创建状态管理器，初始化所有响应式状态并提供统一的管理接口。
 *
 * @remarks
 * - 状态管理器负责创建和维护可视化所需的全部响应式状态。
 * - 提供 `resetState` 方法支持重置到初始状态，便于用户重新开始演示。
 * - 实现 `Disposable` 接口，支持资源清理（当前无需清理，保留扩展性）。
 *
 * @param defaultInput - 默认输入数组，作为初始状态和重置目标
 * @returns 状态管理器实例
 */
export function createStateManager(defaultInput: number[]): StateManager {
  /* 创建所有响应式状态，每个状态对应可视化的一个维度。 */
  const inputState = state<number[]>([...defaultInput])
  const isPlayingState = state<boolean>(false)
  const speedState = state<number>(defaultSpeed)
  const hoveredChainIndexesState = state<number[]>([])
  const hoveredChainInfoState = state<{ chainIndex: number } | undefined>(undefined)
  const isSequenceHoveredState = state<boolean>(false)
  const isPredecessorsHoveredState = state<boolean>(false)
  const navigatorVersionState = state<number>(0)

  /* 保存初始值的副本，用于 `resetState` 时恢复。 */
  const initialInput = [...defaultInput]

  /** 聚合所有状态引用，便于统一访问。 */
  const visualizationState: VisualizationState = {
    input: inputState,
    isPlaying: isPlayingState,
    speed: speedState,
    hoveredChainIndexes: hoveredChainIndexesState,
    hoveredChainInfo: hoveredChainInfoState,
    isSequenceHovered: isSequenceHoveredState,
    isPredecessorsHovered: isPredecessorsHoveredState,
    navigatorVersion: navigatorVersionState,
  }

  return {
    /** 获取完整的状态对象，供组件读取各项状态。 */
    getState(): VisualizationState {
      return visualizationState
    },

    /** 重置所有状态到初始值，用于用户点击重置按钮或切换输入时。 */
    resetState(): void {
      inputState.set([...initialInput])
      isPlayingState.set(false)
      speedState.set(defaultSpeed)
      hoveredChainIndexesState.set([])
      hoveredChainInfoState.set(undefined)
      isSequenceHoveredState.set(false)
      isPredecessorsHoveredState.set(false)
      navigatorVersionState.set(0)
    },

    /** 递增导航器版本号，触发依赖该版本的组件重新渲染。 */
    incrementVersion(): void {
      navigatorVersionState.set(navigatorVersionState.get() + 1)
    },

    /** 清理资源（当前无需清理，保留以符合 `Disposable` 接口）。 */
    dispose(): void {
      // 状态管理器目前不需要清理资源
      // 保留此方法以符合 Disposable 接口
    },
  }
}
