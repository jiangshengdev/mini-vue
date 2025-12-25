/**
 * LIS 算法可视化 - 数组显示组件
 *
 * @remarks
 * 显示输入数组，高亮当前处理的索引，支持点击元素跳转到对应步骤。
 * - 每个单元格显示值（上方）和索引（下方）
 * - 支持多种高亮状态：当前处理、最终结果、hover 高亮
 */

import sharedStyles from '../styles/shared.module.css'
import styles from '../styles/array-display.module.css'
import type { SetupComponent } from '@/index.ts'

/** 合并共享样式与组件专属样式 */
const mergedStyles = { ...sharedStyles, ...styles }

/**
 * 数组显示组件的 Props 定义
 */
export interface ArrayDisplayProps {
  /** 输入数组 */
  input: number[]
  /** 当前处理的索引 */
  currentIndex: number
  /** 最终 LIS 结果索引列表 */
  result: number[]
  /** 是否显示最终结果高亮 */
  showResult: boolean
  /** Hover 高亮的索引列表 */
  hoveredIndexes: number[]
  /** 点击元素时的回调 */
  onIndexClick: (index: number) => void
}

/**
 * 数组显示组件，渲染输入数组并支持交互式高亮
 *
 * @remarks
 * - 每个单元格可点击，触发 `onIndexClick` 跳转到对应步骤
 * - 支持多种高亮状态的叠加显示
 */
export const ArrayDisplay: SetupComponent<ArrayDisplayProps> = (props) => {
  /**
   * 创建单元格点击处理函数
   *
   * @remarks
   * 返回闭包以捕获当前索引，避免在渲染时立即执行回调
   */
  const handleClick = (index: number) => {
    return () => {
      props.onIndexClick(index)
    }
  }

  return () => {
    return (
      <div class={mergedStyles.arrayDisplay}>
        <h3 class={mergedStyles.sectionTitle}>输入数组</h3>
        <div class={mergedStyles.arrayLegend}>
          <span class={mergedStyles.legendItem}>上方: value（值）</span>
          <span class={mergedStyles.legendItem}>下方: index（索引）</span>
        </div>
        <div class={mergedStyles.arrayContainer}>
          {props.input.map((value, index) => {
            /* 计算当前单元格的各种高亮状态 */
            const isCurrent = index === props.currentIndex
            const isInResult = props.showResult && props.result.includes(index)
            const isNewNode = value === -1
            const isHovered = props.hoveredIndexes.includes(index)

            /* 根据状态组合 CSS 类名 */
            const cellClasses = [
              mergedStyles.arrayCell,
              isCurrent ? mergedStyles.currentCell : '',
              isInResult ? mergedStyles.resultCell : '',
              isNewNode ? mergedStyles.newNodeCell : '',
              isHovered ? mergedStyles.hoveredCell : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <div
                key={index}
                class={cellClasses}
                onClick={handleClick(index)}
                title={`点击跳转到第 ${index + 1} 步`}
              >
                <span class={mergedStyles.cellValue}>{value === -1 ? '-' : value}</span>
                <span class={mergedStyles.cellIndex}>{index}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
}
