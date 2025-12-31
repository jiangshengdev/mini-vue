/**
 * Predecessors 显示区域子组件。
 *
 * @remarks
 * 显示 predecessors 数组，支持 hover 高亮。
 * 每个位置存储前驱元素的 index，-1 表示无前驱（根节点）。
 */

import sharedStyles from '../../styles/shared.module.css'
import styles from '../../styles/sequence-graph.module.css'
import { renderHighlightedArray } from './highlighted-array.tsx'
import type { SetupComponent } from '@/index.ts'

const mergedStyles = { ...sharedStyles, ...styles }

/**
 * PredecessorSection 组件的 props 定义。
 */
export interface PredecessorSectionProps {
  /** Predecessors 数组 */
  predecessors: number[]
  /** 上一步 predecessors（用于对比显示） */
  previousPredecessors?: number[]
  /** 高亮索引（-1 表示无高亮） */
  highlightPredIndex: number
  /** 高亮类名 */
  highlightClass: string
  /** 变更指示器文本 */
  predChangeIndicator: string
  /** Hover 高亮位置列表 */
  hoveredPositions?: number[]
  /** 鼠标进入回调 */
  onMouseEnter: () => void
  /** 鼠标离开回调 */
  onMouseLeave: () => void
}

/**
 * Predecessors 区域组件，显示当前 predecessors 数组和上一步对比。
 *
 * @remarks
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
        data-testid="lis-predecessors-section"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div class={mergedStyles.sectionTitle}>
          Predecessors:
          <span class={mergedStyles.sectionHint}>
            （每个位置存储前驱元素的 index，-1 表示无前驱）
          </span>
        </div>
        <div class={mergedStyles.stateCompareGrid}>
          {/* 上一步状态（如果存在） */}
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
          {/* 当前状态 */}
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
