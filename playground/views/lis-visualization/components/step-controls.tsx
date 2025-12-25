/**
 * LIS 算法可视化 - 步骤控制组件
 *
 * 实现 Prev/Next/Reset/Auto 按钮和速度滑块
 */

import sharedStyles from '../styles/shared.module.css'
import styles from '../styles/step-controls.module.css'
import type { SetupComponent } from '@/index.ts'

// 确保共享样式（CSS 变量）被加载
void sharedStyles

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
    return (
      <div class={styles.stepControls}>
        <div class={styles.controlsRow}>
          <button
            type="button"
            class={styles.controlButton}
            onClick={props.onPrev}
            disabled={!props.canGoBack}
            title="上一步（←）"
          >
            <span class={styles.iconArrowLeft} />
            上一步
          </button>

          <span class={styles.stepIndicator}>
            第 {props.currentStep} 步 / 共 {props.totalSteps - 1} 步
          </span>

          <button
            type="button"
            class={styles.controlButton}
            onClick={props.onNext}
            disabled={!props.canGoForward}
            title="下一步（→）"
          >
            下一步
            <span class={styles.iconArrowRight} />
          </button>

          <button
            type="button"
            class={styles.controlButton}
            onClick={props.onReset}
            title="重置（Home）"
          >
            <span class={styles.iconReplay} />
            重置
          </button>

          <button
            type="button"
            class={`${styles.controlButton} ${props.isPlaying ? styles.playing : ''}`}
            onClick={props.onTogglePlay}
            title="自动播放/暂停（Space）"
          >
            {props.isPlaying ? (
              <>
                <span class={styles.iconPause} />
                暂停
              </>
            ) : (
              <>
                <span class={styles.iconPlay} />
                自动
              </>
            )}
          </button>
        </div>

        <div class={styles.speedControl}>
          <label class={styles.speedLabel}>
            速度：{props.speed}ms
            <input
              type="range"
              class={styles.speedSlider}
              min="100"
              max="2000"
              step="100"
              value={props.speed}
              onInput={handleSpeedChange}
            />
          </label>
        </div>
      </div>
    )
  }
}
