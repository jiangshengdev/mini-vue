/**
 * Sequence State 显示区域子组件
 *
 * 显示 sequence 状态，支持上一步与当前步骤的对比
 */

import type { SetupComponent } from '@/index.ts'
import styles from '../../styles/visualization.module.css'
import { renderHighlightedArray } from './highlighted-array.tsx'

export interface SequenceSectionProps {
  /** 输入数组 */
  input: number[]
  /** 当前 sequence */
  sequence: number[]
  /** 上一步 sequence */
  previousSequence?: number[]
  /** 高亮位置 */
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
 * Sequence State 区域组件
 *
 * 显示当前 sequence 状态和上一步对比：
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
        class={styles.stateCompareSection}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div class={styles.sectionTitle}>
          Sequence State:
          <span class={styles.sectionHint}>（存储的是 index，→ 后显示对应 value）</span>
        </div>
        <div class={styles.stateCompareGrid}>
          {hasPrevious && previousSequence && (
            <div class={`${styles.stateRow} ${styles.previousRow}`}>
              <span class={styles.stateRowLabel}>上一步:</span>
              <code class={styles.stateCode}>
                {renderHighlightedArray({
                  array: previousSequence,
                  highlightPos: previousHighlightSeqPosition,
                  highlightClass: styles.highlightPrevious,
                  secondaryHighlightValue: previousPredecessorValue,
                  secondaryHighlightClass: styles.highlightPreviousSecondary,
                })}
              </code>
              <code class={styles.stateCode}>
                → values:{' '}
                {renderHighlightedArray({
                  array: previousSequence.map((idx) => input[idx]),
                  highlightPos: previousHighlightSeqPosition,
                  highlightClass: styles.highlightPrevious,
                })}
              </code>
              <span class={styles.changeIndicator}></span>
            </div>
          )}
          <div class={styles.stateRow}>
            <span class={styles.stateRowLabel}>{hasPrevious ? '当前:' : ''}</span>
            <code class={styles.stateCode}>
              {renderHighlightedArray({
                array: sequence,
                highlightPos: highlightSeqPosition,
                highlightClass,
                secondaryHighlightValue: predecessorValue,
                secondaryHighlightClass,
              })}
            </code>
            <code class={styles.stateCode}>
              → values:{' '}
              {renderHighlightedArray({
                array: sequence.map((idx) => input[idx]),
                highlightPos: highlightSeqPosition,
                highlightClass,
              })}
            </code>
            <span class={styles.changeIndicator}>{seqChangeIndicator}</span>
          </div>
        </div>
      </div>
    )
  }
}
