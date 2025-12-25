/**
 * LIS 算法可视化 - 主页面组件
 *
 * 作为编排层，组合所有子模块和 UI 组件
 */

import {
  ActionPanel,
  ArrayDisplay,
  InputEditor,
  SequenceGraph,
  StepControls,
} from './components/index.ts'
import {
  createHoverManager,
  createKeyboardHandler,
  createPlaybackController,
  createStateManager,
} from './controllers/index.ts'
import { createEventHandlers } from './handlers/index.ts'
import { createStepNavigator } from './navigator.ts'
import sharedStyles from './styles/shared.module.css'
import layoutStyles from './styles/layout.module.css'
import { traceLongestIncreasingSubsequence } from './trace.ts'
import type { StepNavigator } from './types.ts'
import type { SetupComponent } from '@/index.ts'
import { onScopeDispose } from '@/index.ts'

// 合并样式对象
const styles = { ...sharedStyles, ...layoutStyles }

/** 默认输入数组 */
const defaultInput = [2, 1, 3, 0, 4]

export const LongestIncreasingSubsequenceVisualization: SetupComponent = () => {
  // ============================================================================
  // 初始化状态管理器
  // ============================================================================
  const stateManager = createStateManager(defaultInput)
  const state = stateManager.getState()

  // ============================================================================
  // 追踪结果和导航器（非响应式，手动管理）
  // ============================================================================
  let trace = traceLongestIncreasingSubsequence(state.input.get())
  let navigator: StepNavigator = createStepNavigator(trace)

  /** 获取当前导航器（用于闭包） */
  const getNavigator = (): StepNavigator => {
    return navigator
  }

  // ============================================================================
  // 初始化 Hover 管理器
  // ============================================================================
  const hoverManager = createHoverManager({
    stateManager,
    getCurrentStep() {
      return navigator.getCurrentStep()
    },
  })

  /** 步骤切换时的统一更新（刷新 hover 状态 + 触发响应式更新） */
  const updateStep = (): void => {
    hoverManager.refreshHoverState()
    stateManager.incrementVersion()
  }

  /** 重新计算追踪和导航器 */
  const resetNavigator = (): void => {
    trace = traceLongestIncreasingSubsequence(state.input.get())
    navigator = createStepNavigator(trace)
    updateStep()
  }

  // ============================================================================
  // 初始化播放控制器
  // ============================================================================
  const playbackController = createPlaybackController({
    stateManager,
    navigator,
    onStepUpdate: updateStep,
  })

  // ============================================================================
  // 初始化事件处理器
  // ============================================================================
  const eventHandlers = createEventHandlers({
    stateManager,
    getNavigator,
    playbackController,
    hoverManager,
    resetNavigator,
    updateStep,
  })

  // ============================================================================
  // 初始化键盘处理器
  // ============================================================================
  const keyboardHandler = createKeyboardHandler({
    onPrevious: eventHandlers.handlePrevious,
    onNext: eventHandlers.handleNext,
    onReset: eventHandlers.handleReset,
    onGoToEnd() {
      playbackController.stop()

      const navState = navigator.getState()

      navigator.goTo(navState.totalSteps - 1)
      updateStep()
    },
    onTogglePlay: eventHandlers.handleTogglePlay,
    onSpeedUp() {
      const currentSpeed = state.speed.get()
      const newSpeed = Math.max(100, currentSpeed - 100)

      eventHandlers.handleSpeedChange(newSpeed)
    },
    onSpeedDown() {
      const currentSpeed = state.speed.get()
      const newSpeed = Math.min(2000, currentSpeed + 100)

      eventHandlers.handleSpeedChange(newSpeed)
    },
  })

  // 注册键盘事件监听
  keyboardHandler.register()

  // ============================================================================
  // 清理函数
  // ============================================================================
  onScopeDispose(() => {
    playbackController.dispose()
    keyboardHandler.dispose()
    stateManager.dispose()
  })

  // ============================================================================
  // 渲染函数
  // ============================================================================
  return () => {
    // 触发依赖追踪
    state.navigatorVersion.get()

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
            <p class={styles.intro}>
              Chain View 显示每个长度的最佳链；Sequence 列表展示各长度的当前最佳尾节点，Predecessors
              可回溯出对应链。输入数组后可逐步查看贪心 +
              二分的构造过程，空格播放、左右箭头单步，或点击数组索引跳到对应步骤。
            </p>
            <InputEditor
              input={state.input.get()}
              onInputChange={eventHandlers.handleInputChange}
            />
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
          <p class={styles.intro}>
            Chain View 显示每个长度的最佳链；Sequence 列表展示各长度的当前最佳尾节点，Predecessors
            可回溯出对应链。输入数组后可逐步查看贪心 +
            二分的构造过程，空格播放、左右箭头单步，或点击数组索引跳到对应步骤。
          </p>
          <InputEditor input={state.input.get()} onInputChange={eventHandlers.handleInputChange} />
          <StepControls
            currentStep={navState.currentStep}
            totalSteps={navState.totalSteps}
            canGoBack={navState.canGoBack}
            canGoForward={navState.canGoForward}
            isPlaying={state.isPlaying.get()}
            speed={state.speed.get()}
            onPrev={eventHandlers.handlePrevious}
            onNext={eventHandlers.handleNext}
            onReset={eventHandlers.handleReset}
            onTogglePlay={eventHandlers.handleTogglePlay}
            onSpeedChange={eventHandlers.handleSpeedChange}
          />
        </header>

        <main class={styles.main}>
          <ArrayDisplay
            input={trace.input}
            currentIndex={step?.currentIndex ?? -1}
            result={trace.result}
            showResult={showResult}
            hoveredIndexes={state.hoveredChainIndexes.get()}
            onIndexClick={eventHandlers.handleIndexClick}
          />

          <SequenceGraph
            input={trace.input}
            sequence={step?.sequence ?? []}
            predecessors={step?.predecessors ?? []}
            action={step?.action}
            previousSequence={previousStep?.sequence}
            previousPredecessors={previousStep?.predecessors}
            hoveredIndexes={state.hoveredChainIndexes.get()}
            onChainHover={eventHandlers.handleChainHover}
            onChainLeave={eventHandlers.handleChainLeave}
            isSequenceHovered={state.isSequenceHovered.get()}
            onSequenceHover={eventHandlers.handleSequenceHover}
            onSequenceLeave={eventHandlers.handleSequenceLeave}
            isPredecessorsHovered={state.isPredecessorsHovered.get()}
            onPredecessorsHover={eventHandlers.handlePredecessorsHover}
            onPredecessorsLeave={eventHandlers.handlePredecessorsLeave}
          />

          <ActionPanel
            action={step?.action}
            currentValue={step?.currentValue}
            sequence={step?.sequence ?? []}
            predecessors={step?.predecessors ?? []}
          />
        </main>

        <footer class={styles.footer}>
          <h2 class={styles.sectionTitle}>原理速记</h2>
          <ul class={styles.principlesList}>
            <li>每步只做追加、替换或跳过（-1）。</li>
            <li>
              虽然仅存 Sequence /
              Predecessors，但隐含了每个长度的完整最优链表，可据此重建并显示全部节点。
            </li>
            <li>
              追加：当新元素大于当前最长链的末尾时，以该链为基础重建更长的链，把当前元素接在末尾；新旧两条链都会保留。
            </li>
            <li>
              替换：只替换各链的末尾元素，用二分在当前各链末尾中找到插入位，且当前元素更小时才会替换；被命中的那条链会被废弃，从长度减一的链末尾元素开始，用当前元素追加重建这一长度的新链。
            </li>
            <li>回溯：从任意末尾元素沿 Predecessors 向前可还原对应最佳链。</li>
            <li>链表视图每步只会有一条链发生变化，其余链保持上一状态。</li>
          </ul>
        </footer>
      </div>
    )
  }
}

export default LongestIncreasingSubsequenceVisualization
