/**
 * LIS 算法可视化 - 数组显示组件
 *
 * 显示输入数组，高亮当前处理的索引，支持点击元素跳转到对应步骤
 */

import type { SetupComponent } from '@/index.ts'
import styles from '../styles/visualization.module.css'

export interface ArrayDisplayProps {
  /** 输入数组 */
  input: number[]
  /** 当前处理的索引 */
  currentIndex: number
  /** 最终 LIS 结果索引列表 */
  result: number[]
  /** 是否显示最终结果高亮 */
  showResult: boolean
  /** 点击元素时的回调 */
  onIndexClick: (index: number) => void
}

export const ArrayDisplay: SetupComponent<ArrayDisplayProps> = (props) => {
  const handleClick = (index: number) => () => {
    props.onIndexClick(index)
  }

  return () => {
    const { input, currentIndex, result, showResult } = props

    return (
      <div class={styles.arrayDisplay}>
        <h3 class={styles.sectionTitle}>输入数组</h3>
        <div class={styles.arrayContainer}>
          {input.map((value, index) => {
            const isCurrent = index === currentIndex
            const isInResult = showResult && result.includes(index)

            const cellClasses = [
              styles.arrayCell,
              isCurrent ? styles.currentCell : '',
              isInResult ? styles.resultCell : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <div
                key={index}
                class={cellClasses}
                onClick={handleClick(index)}
                title={`点击跳转到步骤 ${index}`}
              >
                <span class={styles.cellValue}>{value === -1 ? '-' : value}</span>
                <span class={styles.cellIndex}>{index}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
}
