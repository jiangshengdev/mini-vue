/**
 * LIS 算法可视化 - 主页面组件
 *
 * 组合所有子组件，管理响应式状态
 */

import {
  ActionPanel,
  ArrayDisplay,
  InputEditor,
  SequenceGraph,
  StepControls,
} from './components/index.ts'
import { createStepNavigator } from './navigator.ts'
import styles from './styles/visualization.module.css'
import { traceLongestIncreasingSubsequence } from './trace.ts'
import type { SetupComponent } from '@/index.ts'
import { onScopeDispose, state } from '@/index.ts'

/** 默认输入数组 */
const defaultInput = [2, 1, 3, 0, 4]

export const LongestIncreasingSubsequenceVisualization: SetupComponent = () => {
  /* 响应式状态 */
  const input = state(defaultInput)
  const isPlaying = state(false)
  const speed = state(500)
  const hoveredChainIndexes = state<number[]>([])
  const isSequenceHovered = state(false)
  const isPredecessorsHovered = state(false)
  /* 导航器版本号（用于触发响应式更新） */
  const navigatorVersion = state(0)

  /* 追踪结果和导航器（非响应式，手动管理） */
  let trace = traceLongestIncreasingSubsequence(input.get())
  let navigator = createStepNavigator(trace)

  /* 步骤切换时的统一更新（清空 hover 状态 + 触发响应式更新） */
  const updateStep = () => {
    hoveredChainIndexes.set([])
    isSequenceHovered.set(false)
    isPredecessorsHovered.set(false)
    navigatorVersion.set(navigatorVersion.get() + 1)
  }

  /* 重新计算追踪和导航器 */
  const resetNavigator = () => {
    trace = traceLongestIncreasingSubsequence(input.get())
    navigator = createStepNavigator(trace)
    updateStep()
  }

  /* 自动播放定时器 */
  let playTimer: ReturnType<typeof setInterval> | undefined

  const stopAutoPlay = () => {
    if (playTimer) {
      clearInterval(playTimer)
      playTimer = undefined
    }

    isPlaying.set(false)
  }

  const startAutoPlay = () => {
    stopAutoPlay()
    isPlaying.set(true)
    playTimer = setInterval(() => {
      const result = navigator.next()

      if (result) {
        updateStep()
      } else {
        stopAutoPlay()
      }
    }, speed.get())
  }

  /* 事件处理函数 */
  const handleInputChange = (newInput: number[]) => {
    stopAutoPlay()
    input.set(newInput)
    resetNavigator()
  }

  const handlePrevious = () => {
    navigator.prev()
    updateStep()
  }

  const handleNext = () => {
    navigator.next()
    updateStep()
  }

  const handleReset = () => {
    stopAutoPlay()
    navigator.reset()
    updateStep()
  }

  const handleTogglePlay = () => {
    if (isPlaying.get()) {
      stopAutoPlay()
    } else {
      startAutoPlay()
    }
  }

  const handleSpeedChange = (newSpeed: number) => {
    speed.set(newSpeed)

    // 如果正在播放，重新启动以应用新速度
    if (isPlaying.get()) {
      startAutoPlay()
    }
  }

  const handleIndexClick = (index: number) => {
    stopAutoPlay()
    // 第 0 步是 init，所以点击数组索引 i 应该跳转到步骤 i + 1
    navigator.goTo(index + 1)
    updateStep()
  }

  /* 链 hover 事件处理 */
  const handleChainHover = (indexes: number[]) => {
    hoveredChainIndexes.set(indexes)
  }

  const handleChainLeave = () => {
    hoveredChainIndexes.set([])
  }

  /* Sequence State hover 事件处理 */
  const handleSequenceHover = () => {
    isSequenceHovered.set(true)
  }

  const handleSequenceLeave = () => {
    isSequenceHovered.set(false)
  }

  /* Predecessors hover 事件处理 */
  const handlePredecessorsHover = () => {
    isPredecessorsHovered.set(true)
  }

  const handlePredecessorsLeave = () => {
    isPredecessorsHovered.set(false)
  }

  /* 键盘快捷键处理 */
  const handleKeyDown = (event: KeyboardEvent) => {
    // 如果焦点在输入框内，不触发快捷键
    const target = event.target as HTMLElement

    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    const { key } = event

    // 导航快捷键
    if (key === 'ArrowLeft') {
      event.preventDefault()
      handlePrevious()

      return
    }

    if (key === 'ArrowRight') {
      event.preventDefault()
      handleNext()

      return
    }

    if (key === 'Home') {
      event.preventDefault()
      handleReset()

      return
    }

    if (key === 'End') {
      event.preventDefault()
      stopAutoPlay()

      const navState = navigator.getState()

      navigator.goTo(navState.totalSteps - 1)
      updateStep()

      return
    }

    // 播放控制
    if (key === ' ') {
      event.preventDefault()
      handleTogglePlay()

      return
    }

    // 速度控制：+ 或 = 加速
    if (key === '+' || key === '=') {
      event.preventDefault()

      const currentSpeed = speed.get()
      const newSpeed = Math.max(100, currentSpeed - 100)

      handleSpeedChange(newSpeed)

      return
    }

    // 速度控制：- 或 _ 减速
    if (key === '-' || key === '_') {
      event.preventDefault()

      const currentSpeed = speed.get()
      const newSpeed = Math.min(2000, currentSpeed + 100)

      handleSpeedChange(newSpeed)
    }
  }

  /* 注册键盘事件监听 */
  globalThis.addEventListener('keydown', handleKeyDown)

  /* 清理函数 */
  onScopeDispose(() => {
    stopAutoPlay()
    globalThis.removeEventListener('keydown', handleKeyDown)
  })

  return () => {
    // 触发依赖追踪
    navigatorVersion.get()

    const step = navigator.getCurrentStep()
    const previousStep = navigator.getPreviousStep()
    const navState = navigator.getState()
    const showResult = navState.currentStep === navState.totalSteps - 1

    /* 处理空输入的情况 */
    if (trace.steps.length === 0) {
      return (
        <div class={styles.container}>
          <header class={styles.header}>
            <h1 class={styles.title}>LIS 算法可视化</h1>
            <InputEditor input={input.get()} onInputChange={handleInputChange} />
          </header>
          <main class={styles.main}>
            <div class={styles.emptyState}>请输入数组以开始可视化</div>
          </main>
        </div>
      )
    }

    return (
      <div class={styles.container}>
        <header class={styles.header}>
          <h1 class={styles.title}>LIS 算法可视化</h1>
          <InputEditor input={input.get()} onInputChange={handleInputChange} />
          <StepControls
            currentStep={navState.currentStep}
            totalSteps={navState.totalSteps}
            canGoBack={navState.canGoBack}
            canGoForward={navState.canGoForward}
            isPlaying={isPlaying.get()}
            speed={speed.get()}
            onPrev={handlePrevious}
            onNext={handleNext}
            onReset={handleReset}
            onTogglePlay={handleTogglePlay}
            onSpeedChange={handleSpeedChange}
          />
        </header>

        <main class={styles.main}>
          <ArrayDisplay
            input={trace.input}
            currentIndex={step?.currentIndex ?? -1}
            result={trace.result}
            showResult={showResult}
            hoveredIndexes={hoveredChainIndexes.get()}
            onIndexClick={handleIndexClick}
          />

          <SequenceGraph
            input={trace.input}
            sequence={step?.sequence ?? []}
            predecessors={step?.predecessors ?? []}
            action={step?.action}
            previousSequence={previousStep?.sequence}
            previousPredecessors={previousStep?.predecessors}
            hoveredIndexes={hoveredChainIndexes.get()}
            onChainHover={handleChainHover}
            onChainLeave={handleChainLeave}
            isSequenceHovered={isSequenceHovered.get()}
            onSequenceHover={handleSequenceHover}
            onSequenceLeave={handleSequenceLeave}
            isPredecessorsHovered={isPredecessorsHovered.get()}
            onPredecessorsHover={handlePredecessorsHover}
            onPredecessorsLeave={handlePredecessorsLeave}
          />

          <ActionPanel
            action={step?.action}
            currentValue={step?.currentValue}
            sequence={step?.sequence ?? []}
            predecessors={step?.predecessors ?? []}
          />
        </main>
      </div>
    )
  }
}

export default LongestIncreasingSubsequenceVisualization
