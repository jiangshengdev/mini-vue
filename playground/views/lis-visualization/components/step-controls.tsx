/**
 * LIS 算法可视化 - 步骤控制组件
 *
 * 实现 Prev/Next/Reset/Auto 按钮和速度滑块
 */

import type { SetupComponent } from '@/index.ts'
import styles from '../styles/visualization.module.css'

export interface StepControlsProps {
  /** 当前步骤索引 */
  currentStep: number
  /** 总步骤数 */
  totalSteps: number
  /** 是否可以后退 */
  canGoBack: boolean
  /** 是否可以前进 */
  canGoForward: boolean
  /** 是否正在自动播放 */
  isPlaying: boolean
  /** 播放速度（毫秒） */
  speed: number
  /** 点击上一步 */
  onPrev: () => void
  /** 点击下一步 */
  onNext: () => void
  /** 点击重置 */
  onReset: () => void
  /** 点击自动播放/暂停 */
  onTogglePlay: () => void
  /** 速度变化 */
  onSpeedChange: (speed: number) => void
}

export const StepControls: SetupComponent<StepControlsProps> = (props) => {
  const handleSpeedChange = (event: Event) => {
    const target = event.target as HTMLInputElement

    props.onSpeedChange(Number(target.value))
  }

  return () => {
    const {
      currentStep,
      totalSteps,
      canGoBack,
      canGoForward,
      isPlaying,
      speed,
      onPrev,
      onNext,
      onReset,
      onTogglePlay,
    } = props

    return (
      <div class={styles.stepControls}>
        <div class={styles.controlsRow}>
          <button
            type="button"
            class={styles.controlButton}
            onClick={onPrev}
            disabled={!canGoBack}
            title="上一步 (←)"
          >
            ◀ Prev
          </button>

          <span class={styles.stepIndicator}>
            Step {currentStep + 1} / {totalSteps}
          </span>

          <button
            type="button"
            class={styles.controlButton}
            onClick={onNext}
            disabled={!canGoForward}
            title="下一步 (→)"
          >
            Next ▶
          </button>

          <button type="button" class={styles.controlButton} onClick={onReset} title="重置 (Home)">
            ⟲ Reset
          </button>

          <button
            type="button"
            class={`${styles.controlButton} ${isPlaying ? styles.playing : ''}`}
            onClick={onTogglePlay}
            title="自动播放/暂停 (Space)"
          >
            {isPlaying ? '⏸ Pause' : '▶ Auto'}
          </button>
        </div>

        <div class={styles.speedControl}>
          <label class={styles.speedLabel}>
            速度: {speed}ms
            <input
              type="range"
              class={styles.speedSlider}
              min="100"
              max="2000"
              step="100"
              value={speed}
              onInput={handleSpeedChange}
            />
          </label>
        </div>
      </div>
    )
  }
}
