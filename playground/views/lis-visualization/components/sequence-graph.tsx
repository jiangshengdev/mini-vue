/**
 * LIS 算法可视化 - 序列状态图组件
 *
 * 显示 Sequence State、Predecessors 数组和 Chain View
 * 支持上一步与当前步骤的状态对比
 *
 * 该组件作为编排层，组合子组件并协调它们之间的交互
 */

import type { StepAction } from '../types'
import type { SetupComponent } from '@/index.ts'
import styles from '../styles/visualization.module.css'

// 导入子组件
import { SequenceSection, PredecessorSection, ChainView } from './sequence-graph/index.ts'

// 导入工具函数
import {
  buildAllChains,
  computeChangedNodesByChain,
  getHighlightClass,
  getSecondaryHighlightClass,
  getSeqChangeIndicator,
  computeHighlightState,
  computePredecessorHighlight,
  computePredChangeIndicator,
} from '../utils/index.ts'

export interface SequenceGraphProps {
  input: number[]
  sequence: number[]
  predecessors: number[]
  action?: StepAction
  previousSequence?: number[]
  previousPredecessors?: number[]
  hoveredIndexes?: number[]
  onChainHover?: (indexes: number[], chainIndex: number) => void
  onChainLeave?: () => void
  isSequenceHovered?: boolean
  onSequenceHover?: () => void
  onSequenceLeave?: () => void
  isPredecessorsHovered?: boolean
  onPredecessorsHover?: () => void
  onPredecessorsLeave?: () => void
}

export const SequenceGraph: SetupComponent<SequenceGraphProps> = (props) => {
  // 事件处理函数
  const handleChainHover = (chain: number[], chainIndex: number) => {
    props.onChainHover?.(chain, chainIndex)
  }

  const handleChainLeave = () => {
    props.onChainLeave?.()
  }

  const handleSequenceMouseEnter = () => {
    props.onSequenceHover?.()
  }

  const handleSequenceMouseLeave = () => {
    props.onSequenceLeave?.()
  }

  const handlePredecessorsMouseEnter = () => {
    props.onPredecessorsHover?.()
  }

  const handlePredecessorsMouseLeave = () => {
    props.onPredecessorsLeave?.()
  }

  return () => {
    const { action, previousSequence, previousPredecessors } = props

    // 构建链数据
    const chains = buildAllChains(props.sequence, props.predecessors)
    const previousChains =
      previousSequence && previousPredecessors
        ? buildAllChains(previousSequence, previousPredecessors)
        : undefined

    // 计算高亮状态
    const highlightClass = getHighlightClass(action, styles)
    const secondaryHighlightClass = getSecondaryHighlightClass(action, styles)
    const hasPrevious = previousSequence !== undefined
    const isChainAction = action?.type === 'append' || action?.type === 'replace'

    const { highlightSeqPosition, highlightPredIndex, previousHighlightSeqPosition } =
      computeHighlightState(action, props.sequence)

    const changedNodesByChain = computeChangedNodesByChain(
      chains,
      previousChains,
      isChainAction,
      highlightPredIndex,
    )

    // 计算指示器文本
    const seqChangeIndicator = getSeqChangeIndicator(action, hasPrevious)

    const { predecessorValue, previousPredecessorValue } = computePredecessorHighlight(
      highlightPredIndex,
      props.predecessors,
      action,
    )

    const predChangeIndicator = computePredChangeIndicator(
      hasPrevious,
      previousPredecessors,
      highlightPredIndex,
      props.predecessors,
    )

    return (
      <div class={styles.sequenceGraph}>
        <SequenceSection
          input={props.input}
          sequence={props.sequence}
          previousSequence={previousSequence}
          highlightSeqPosition={highlightSeqPosition}
          previousHighlightSeqPosition={previousHighlightSeqPosition}
          predecessorValue={predecessorValue}
          previousPredecessorValue={previousPredecessorValue}
          highlightClass={highlightClass}
          secondaryHighlightClass={secondaryHighlightClass}
          seqChangeIndicator={seqChangeIndicator}
          onMouseEnter={handleSequenceMouseEnter}
          onMouseLeave={handleSequenceMouseLeave}
        />

        <PredecessorSection
          predecessors={props.predecessors}
          previousPredecessors={previousPredecessors}
          highlightPredIndex={highlightPredIndex}
          highlightClass={highlightClass}
          predChangeIndicator={predChangeIndicator}
          hoveredPositions={props.hoveredIndexes}
          onMouseEnter={handlePredecessorsMouseEnter}
          onMouseLeave={handlePredecessorsMouseLeave}
        />

        <ChainView
          chains={chains}
          changedNodesByChain={changedNodesByChain}
          highlightPredIndex={highlightPredIndex}
          isChainAction={isChainAction}
          highlightClass={highlightClass}
          isSequenceHovered={Boolean(props.isSequenceHovered)}
          isPredecessorsHovered={props.isPredecessorsHovered}
          input={props.input}
          predecessors={props.predecessors}
          actionType={action?.type}
          onChainHover={handleChainHover}
          onChainLeave={handleChainLeave}
        />
      </div>
    )
  }
}
