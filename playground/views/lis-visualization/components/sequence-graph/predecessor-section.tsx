/**
 * Predecessors 显示区域子组件
 *
 * 显示 predecessors 数组，支持 hover 高亮
 */

import type { SetupComponent } from '@/index.ts'
import styles from '../../styles/visualization.module.css'
import { renderHighlightedArray } from './highlighted-array.tsx'

export interface PredecessorSectionProps {
  /** predecessors 数组 */
  predecessors: number[]
  /** 上一步 predecessors */
  previousPredecessors?: number[]
  /** 高亮索引 */
  highlightPredIndex: number
  /** 高亮类名 */
  highlightClass: string
  /** 变更指示器文本 */
  predChangeIndicator: string
  /** hover 高亮位置列表 */
  hoveredPositions?: number[]
  /** 鼠标进入回调 */
  onMouseEnter: () => void
  /** 鼠标离开回调 */
  onMouseLeave: () => void
}

/**
 * Predecessors 区域组件
 *
 * 显示当前 predecessors 数组和上一步对比：
 * - 每个位置存储前驱元素的 index
 * - -1 表示无前驱（根节点）
 * - 支持 hover 时高亮链上的节点
 */
export const PredecessorSection: SetupComponent<PredecessorSectionProps> = (props) => {
  return () => {
    const {
      predecessors,
      previousPredecessors,
      highlightPredIndex,
      highlightClass,
      predChangeIndicator,
      hoveredPositions,
      onMouseEnter,
      onMouseLeave,
    } = props

    const hasPrevious = previousPredecessors !== undefined

    return (
      <div
        class={styles.stateCompareSection}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div class={styles.sectionTitle}>
          Predecessors:
          <span class={styles.sectionHint}>（每个位置存储前驱元素的 index，-1 表示无前驱）</span>
        </div>
        <div class={styles.stateCompareGrid}>
          {hasPrevious && previousPredecessors && (
            <div class={`${styles.stateRow} ${styles.previousRow}`}>
              <span class={styles.stateRowLabel}>上一步:</span>
              <code class={styles.stateCode}>
                {renderHighlightedArray({
                  array: previousPredecessors,
                  highlightPos: highlightPredIndex,
                  highlightClass: styles.highlightPrevious,
                })}
              </code>
              <span></span>
              <span class={styles.changeIndicator}></span>
            </div>
          )}
          <div class={styles.stateRow}>
            <span class={styles.stateRowLabel}>{hasPrevious ? '当前:' : ''}</span>
            <code class={styles.stateCode}>
              {renderHighlightedArray({
                array: predecessors,
                highlightPos: highlightPredIndex,
                highlightClass,
                hoveredPositions,
              })}
            </code>
            <span></span>
            <span class={styles.changeIndicator}>{predChangeIndicator}</span>
          </div>
        </div>
      </div>
    )
  }
}
