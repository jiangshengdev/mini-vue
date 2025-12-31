/**
 * LIS 算法可视化 - 步骤控制组件
 *
 * @remarks
 * 提供算法执行的步骤控制界面。
 * - 导航按钮：上一步、下一步、重置
 * - 自动播放：播放/暂停切换
 * - 速度控制：滑块调节播放速度
 */

import sharedStyles from '../styles/shared.module.css'
import styles from '../styles/step-controls.module.css'
import { createKeyboardHandler } from '../controllers/index.ts'
import type { SetupComponent } from '@/index.ts'
import { onMounted, onUnmounted } from '@/index.ts'

/* 确保共享样式（CSS 变量）被加载 */
void sharedStyles

/**
 * 步骤控制组件的 Props 定义
 */
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
  /** 跳转到最后一步（End） */
  onGoToEnd?: () => void
  /** 速度变化 */
  onSpeedChange: (speed: number) => void
}

/**
 * 步骤控制组件，提供算法执行的导航和播放控制
 *
 * @remarks
 * - 支持键盘快捷键：← 上一步、→ 下一步、Home 重置、End 跳到最后、Space 播放/暂停、+/- 调速
 * - 速度滑块范围：100ms ~ 2000ms
 */
export const StepControls: SetupComponent<StepControlsProps> = (props) => {
  /** 处理速度滑块变化 */
  const handleSpeedChange = (event: Event) => {
    const target = event.target as HTMLInputElement

    props.onSpeedChange(Number(target.value))
  }

  const keyboardHandler = createKeyboardHandler({
    onPrevious: props.onPrev,
    onNext: props.onNext,
    onReset: props.onReset,
    onGoToEnd() {
      props.onGoToEnd?.()
    },
    onTogglePlay: props.onTogglePlay,
    onSpeedUp() {
      const newSpeed = Math.max(100, props.speed - 100)

      props.onSpeedChange(newSpeed)
    },
    onSpeedDown() {
      const newSpeed = Math.min(2000, props.speed + 100)

      props.onSpeedChange(newSpeed)
    },
  })

  onMounted(() => {
    keyboardHandler.register()
  })

  onUnmounted(() => {
    keyboardHandler.dispose()
  })

  return () => {
    return (
      <div class={styles.stepControls}>
        {/* 控制按钮行 */}
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

        {/* 速度控制滑块 */}
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
