/**
 * Predecessors 显示区域子组件
 *
 * 显示 predecessors 数组，支持 hover 高亮
 */

import type { SetupComponent } from '@/index.ts'
import sharedStyles from '../../styles/shared.module.css'
import styles from '../../styles/sequence-graph.module.css'
import { renderHighlightedArray } from './highlighted-array.tsx'

// 合并样式对象
const mergedStyles = { ...sharedStyles, ...styles }

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
        class={mergedStyles.stateCompareSection}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div class={mergedStyles.sectionTitle}>
          Predecessors:
          <span class={mergedStyles.sectionHint}>（每个位置存储前驱元素的 index，-1 表示无前驱）</span>
        </div>
        <div class={mergedStyles.stateCompareGrid}>
          {hasPrevious && previousPredecessors && (
            <div class={`${mergedStyles.stateRow} ${mergedStyles.previousRow}`}>
              <span class={mergedStyles.stateRowLabel}>上一步:</span>
              <code class={mergedStyles.stateCode}>
                {renderHighlightedArray({
                  array: previousPredecessors,
                  highlightPos: highlightPredIndex,
                  highlightClass: mergedStyles.highlightPrevious,
                })}
              </code>
              <span></span>
              <span class={mergedStyles.changeIndicator}></span>
            </div>
          )}
          <div class={mergedStyles.stateRow}>
            <span class={mergedStyles.stateRowLabel}>{hasPrevious ? '当前:' : ''}</span>
            <code class={mergedStyles.stateCode}>
              {renderHighlightedArray({
                array: predecessors,
                highlightPos: highlightPredIndex,
                highlightClass,
                hoveredPositions,
              })}
            </code>
            <span></span>
            <span class={mergedStyles.changeIndicator}>{predChangeIndicator}</span>
          </div>
        </div>
      </div>
    )
  }
}
