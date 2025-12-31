/**
 * Sequence State 显示区域子组件。
 *
 * @remarks
 * 显示 sequence 状态，支持上一步与当前步骤的对比。
 * 索引数组存储的是 input 数组的索引，同时显示对应的实际值。
 */

import sharedStyles from '../../styles/shared.module.css'
import styles from '../../styles/sequence-graph.module.css'
import { renderHighlightedArray } from './highlighted-array.tsx'
import type { SetupComponent } from '@/index.ts'

const mergedStyles = { ...sharedStyles, ...styles }

/**
 * SequenceSection 组件的 props 定义。
 */
export interface SequenceSectionProps {
  /** 输入数组 */
  input: number[]
  /** 当前 sequence（索引数组） */
  sequence: number[]
  /** 上一步 sequence（用于对比显示） */
  previousSequence?: number[]
  /** 高亮位置（-1 表示无高亮） */
  highlightSeqPosition: number
  /** 上一步高亮位置 */
  previousHighlightSeqPosition: number
  /** 前驱值（用于半高亮） */
  predecessorValue?: number
  /** 上一步前驱值 */
  previousPredecessorValue?: number
  /** 高亮类名 */
  highlightClass: string
  /** 半高亮类名 */
  secondaryHighlightClass: string
  /** 变更指示器文本 */
  seqChangeIndicator: string
  /** 鼠标进入回调 */
  onMouseEnter: () => void
  /** 鼠标离开回调 */
  onMouseLeave: () => void
}

/**
 * Sequence State 区域组件，显示当前 sequence 状态和上一步对比。
 *
 * @remarks
 * - 索引数组：存储的是 input 数组的索引
 * - 值数组：对应索引位置的实际值
 * - 变更指示器：显示操作类型（追加/替换/无变化）
 */
export const SequenceSection: SetupComponent<SequenceSectionProps> = (props) => {
  return () => {
    const {
      input,
      sequence,
      previousSequence,
      highlightSeqPosition,
      previousHighlightSeqPosition,
      predecessorValue,
      previousPredecessorValue,
      highlightClass,
      secondaryHighlightClass,
      seqChangeIndicator,
      onMouseEnter,
      onMouseLeave,
    } = props

    const hasPrevious = previousSequence !== undefined

    return (
      <div
        class={mergedStyles.stateCompareSection}
        data-testid="lis-sequence-section"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div class={mergedStyles.sectionTitle}>
          Sequence State:
          <span class={mergedStyles.sectionHint}>（存储的是 index，→ 后显示对应 value）</span>
        </div>
        <div class={mergedStyles.stateCompareGrid}>
          {/* 上一步状态（如果存在） */}
          {hasPrevious && previousSequence && (
            <div class={`${mergedStyles.stateRow} ${mergedStyles.previousRow}`}>
              <span class={mergedStyles.stateRowLabel}>上一步:</span>
              <code class={mergedStyles.stateCode}>
                {renderHighlightedArray({
                  array: previousSequence,
                  highlightPos: previousHighlightSeqPosition,
                  highlightClass: mergedStyles.highlightPrevious,
                  secondaryHighlightValue: previousPredecessorValue,
                  secondaryHighlightClass: mergedStyles.highlightPreviousSecondary,
                })}
              </code>
              <code class={mergedStyles.stateCode}>
                → values:{' '}
                {renderHighlightedArray({
                  array: previousSequence.map((idx) => {
                    return input[idx]
                  }),
                  highlightPos: previousHighlightSeqPosition,
                  highlightClass: mergedStyles.highlightPrevious,
                })}
              </code>
              <span class={mergedStyles.changeIndicator}></span>
            </div>
          )}
          {/* 当前状态 */}
          <div class={mergedStyles.stateRow}>
            <span class={mergedStyles.stateRowLabel}>{hasPrevious ? '当前:' : ''}</span>
            <code class={mergedStyles.stateCode}>
              {renderHighlightedArray({
                array: sequence,
                highlightPos: highlightSeqPosition,
                highlightClass,
                secondaryHighlightValue: predecessorValue,
                secondaryHighlightClass,
              })}
            </code>
            <code class={mergedStyles.stateCode}>
              → values:{' '}
              {renderHighlightedArray({
                array: sequence.map((idx) => {
                  return input[idx]
                }),
                highlightPos: highlightSeqPosition,
                highlightClass,
              })}
            </code>
            <span class={mergedStyles.changeIndicator}>{seqChangeIndicator}</span>
          </div>
        </div>
      </div>
    )
  }
}
