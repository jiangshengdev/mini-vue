/**
 * 高亮数组渲染工具函数
 *
 * 用于统一渲染带高亮的数组，支持主高亮、半高亮和 hover 高亮
 */

import styles from '../../styles/visualization.module.css'

export interface HighlightedArrayOptions {
  /** 数组数据 */
  array: number[]
  /** 主高亮位置 */
  highlightPos: number
  /** 主高亮类名 */
  highlightClass: string
  /** 半高亮值 */
  secondaryHighlightValue?: number
  /** 半高亮类名 */
  secondaryHighlightClass?: string
  /** hover 高亮位置列表 */
  hoveredPositions?: number[]
}

/**
 * 渲染高亮数组
 *
 * 渲染带有多种高亮状态的数组：
 * - 主高亮：当前操作位置
 * - 半高亮：前驱来源位置
 * - hover 高亮：鼠标悬停时的链节点
 *
 * @param options 渲染选项
 * @returns JSX 元素
 */
export function renderHighlightedArray(options: HighlightedArrayOptions) {
  const {
    array,
    highlightPos,
    highlightClass,
    secondaryHighlightValue,
    secondaryHighlightClass,
    hoveredPositions,
  } = options

  return (
    <>
      [
      {array.map((value, pos) => {
        const isHighlight = pos === highlightPos
        const isSecondaryHighlight =
          secondaryHighlightValue !== undefined &&
          secondaryHighlightValue >= 0 &&
          value === secondaryHighlightValue
        const isHovered = hoveredPositions?.includes(pos)

        const classes: string[] = []

        if (isHighlight) {
          classes.push(isHovered ? styles.highlightHover : highlightClass)
        } else if (isSecondaryHighlight && secondaryHighlightClass) {
          classes.push(secondaryHighlightClass)
        } else if (isHovered) {
          classes.push(styles.highlightHoverText)
        }

        const content = (
          <span key={pos} class={classes.join(' ')}>
            {value}
          </span>
        )

        return pos < array.length - 1 ? [content, ', '] : content
      })}
      ]
    </>
  )
}

