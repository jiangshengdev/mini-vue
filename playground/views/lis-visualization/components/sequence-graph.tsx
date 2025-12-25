/**
 * LIS 算法可视化 - 序列状态图组件
 *
 * @remarks
 * 显示 Sequence State、Predecessors 数组和 Chain View。
 * - 支持上一步与当前步骤的状态对比
 * - 作为编排层，组合子组件并协调它们之间的交互
 * - 处理 hover 事件的传递和高亮状态的计算
 */

import type { StepAction } from '../types'
import sharedStyles from '../styles/shared.module.css'
import styles from '../styles/sequence-graph.module.css'
import {
  buildAllChains,
  computeChangedNodesByChain,
  computeHighlightState,
  computePredChangeIndicator,
  computePredecessorHighlight,
  getHighlightClass,
  getSecondaryHighlightClass,
  getSeqChangeIndicator,
} from '../utils/index.ts'
import { ChainView, PredecessorSection, SequenceSection } from './sequence-graph/index.ts'
import type { SetupComponent } from '@/index.ts'

/** 合并共享样式与组件专属样式 */
const mergedStyles = { ...sharedStyles, ...styles }

/**
 * 序列状态图组件的 Props 定义
 */
export interface SequenceGraphProps {
  /** 输入数组 */
  input: number[]
  /** 当前 sequence 状态 */
  sequence: number[]
  /** 当前 predecessors 状态 */
  predecessors: number[]
  /** 当前操作 */
  action?: StepAction
  /** 上一步的 sequence 状态（用于对比） */
  previousSequence?: number[]
  /** 上一步的 predecessors 状态（用于对比） */
  previousPredecessors?: number[]
  /** Hover 高亮的索引列表 */
  hoveredIndexes?: number[]
  /** 链 hover 事件回调 */
  onChainHover?: (indexes: number[], chainIndex: number) => void
  /** 链 hover 离开事件回调 */
  onChainLeave?: () => void
  /** Sequence 区域是否被 hover */
  isSequenceHovered?: boolean
  /** Sequence 区域 hover 事件回调 */
  onSequenceHover?: () => void
  /** Sequence 区域 hover 离开事件回调 */
  onSequenceLeave?: () => void
  /** Predecessors 区域是否被 hover */
  isPredecessorsHovered?: boolean
  /** Predecessors 区域 hover 事件回调 */
  onPredecessorsHover?: () => void
  /** Predecessors 区域 hover 离开事件回调 */
  onPredecessorsLeave?: () => void
}

/**
 * 序列状态图组件，编排子组件并协调交互
 *
 * @remarks
 * - 计算链数据和高亮状态
 * - 将事件处理函数传递给子组件
 * - 协调 Sequence、Predecessors、ChainView 三个区域的显示
 */
export const SequenceGraph: SetupComponent<SequenceGraphProps> = (props) => {
  /* 链 hover 事件处理 */
  const handleChainHover = (chain: number[], chainIndex: number) => {
    props.onChainHover?.(chain, chainIndex)
  }

  const handleChainLeave = () => {
    props.onChainLeave?.()
  }

  /* Sequence 区域 hover 事件处理 */
  const handleSequenceMouseEnter = () => {
    props.onSequenceHover?.()
  }

  const handleSequenceMouseLeave = () => {
    props.onSequenceLeave?.()
  }

  /* Predecessors 区域 hover 事件处理 */
  const handlePredecessorsMouseEnter = () => {
    props.onPredecessorsHover?.()
  }

  const handlePredecessorsMouseLeave = () => {
    props.onPredecessorsLeave?.()
  }

  return () => {
    const { action, previousSequence, previousPredecessors } = props

    /* 构建当前和上一步的链数据 */
    const chains = buildAllChains(props.sequence, props.predecessors)
    const previousChains =
      previousSequence && previousPredecessors
        ? buildAllChains(previousSequence, previousPredecessors)
        : undefined

    /* 计算高亮相关状态 */
    const highlightClass = getHighlightClass(action, mergedStyles)
    const secondaryHighlightClass = getSecondaryHighlightClass(action, mergedStyles)
    const hasPrevious = previousSequence !== undefined
    const isChainAction = action?.type === 'append' || action?.type === 'replace'

    /* 计算高亮位置和变更节点 */
    const { highlightSeqPosition, highlightPredIndex, previousHighlightSeqPosition } =
      computeHighlightState(action, props.sequence)

    const changedNodesByChain = computeChangedNodesByChain(
      chains,
      previousChains,
      isChainAction,
      highlightPredIndex,
    )

    /* 计算变更指示器文本 */
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
      <div class={mergedStyles.sequenceGraph}>
        {/* Sequence 状态区域 */}
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

        {/* Predecessors 数组区域 */}
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

        {/* 链视图区域 */}
        <ChainView
          chains={chains}
          changedNodesByChain={changedNodesByChain}
          highlightPredIndex={highlightPredIndex}
          isChainAction={isChainAction}
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
