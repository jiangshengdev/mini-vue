/**
 * LIS 可视化 - 状态管理器
 *
 * 集中管理所有响应式状态，提供统一的访问和修改接口
 */

import type { StateManager, StateRef, VisualizationState } from '../types.ts'
import { state } from '@/index.ts'

/** 默认播放速度（毫秒） */
const DEFAULT_SPEED = 500

/**
 * 创建状态引用包装器
 *
 * 将 mini-vue 的 `state` 包装为 `StateRef` 接口
 */
function createStateRef<T>(initialValue: T): StateRef<T> {
  const s = state(initialValue)

  return {
    get: () => s.get(),
    set: (value: T) => {
      s.set(value)
    },
  }
}

/**
 * 创建状态管理器
 *
 * @param defaultInput - 默认输入数组
 * @returns 状态管理器实例
 */
export function createStateManager(defaultInput: number[]): StateManager {
  // 创建所有响应式状态
  const inputState = createStateRef<number[]>([...defaultInput])
  const isPlayingState = createStateRef(false)
  const speedState = createStateRef(DEFAULT_SPEED)
  const hoveredChainIndexesState = createStateRef<number[]>([])
  const hoveredChainInfoState = createStateRef<{ chainIndex: number } | undefined>(undefined)
  const isSequenceHoveredState = createStateRef(false)
  const isPredecessorsHoveredState = createStateRef(false)
  const navigatorVersionState = createStateRef(0)

  // 保存初始值用于重置
  const initialInput = [...defaultInput]

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
    getState(): VisualizationState {
      return visualizationState
    },

    resetState(): void {
      inputState.set([...initialInput])
      isPlayingState.set(false)
      speedState.set(DEFAULT_SPEED)
      hoveredChainIndexesState.set([])
      hoveredChainInfoState.set(undefined)
      isSequenceHoveredState.set(false)
      isPredecessorsHoveredState.set(false)
      navigatorVersionState.set(0)
    },

    incrementVersion(): void {
      navigatorVersionState.set(navigatorVersionState.get() + 1)
    },

    dispose(): void {
      // 状态管理器目前不需要清理资源
      // 保留此方法以符合 Disposable 接口
    },
  }
}
