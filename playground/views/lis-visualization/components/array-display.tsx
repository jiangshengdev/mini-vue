/**
 * LIS 算法可视化 - 数组显示组件
 *
 * 显示输入数组，高亮当前处理的索引，支持点击元素跳转到对应步骤
 */

import sharedStyles from '../styles/shared.module.css'
import styles from '../styles/array-display.module.css'
import type { SetupComponent } from '@/index.ts'

// 合并样式对象
const mergedStyles = { ...sharedStyles, ...styles }

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

export const ArrayDisplay: SetupComponent<ArrayDisplayProps> = (props) => {
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
            const isCurrent = index === props.currentIndex
            const isInResult = props.showResult && props.result.includes(index)
            const isNewNode = value === -1
            const isHovered = props.hoveredIndexes.includes(index)

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
