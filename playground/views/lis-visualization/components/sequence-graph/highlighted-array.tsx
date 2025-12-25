/**
 * 高亮数组渲染工具函数。
 *
 * @remarks
 * 用于统一渲染带高亮的数组，支持主高亮、半高亮和 hover 高亮。
 * 被 `SequenceSection` 和 `PredecessorSection` 组件复用。
 */

import sharedStyles from '../../styles/shared.module.css'

const styles = { ...sharedStyles }

/**
 * 高亮数组渲染选项。
 */
export interface HighlightedArrayOptions {
  /** 数组数据 */
  array: number[]
  /** 主高亮位置（-1 表示无高亮） */
  highlightPos: number
  /** 主高亮类名 */
  highlightClass: string
  /** 半高亮值（前驱来源位置） */
  secondaryHighlightValue?: number
  /** 半高亮类名 */
  secondaryHighlightClass?: string
  /** Hover 高亮位置列表 */
  hoveredPositions?: number[]
}

/**
 * 渲染带有多种高亮状态的数组。
 *
 * @remarks
 * 支持三种高亮状态：
 * - 主高亮：当前操作位置
 * - 半高亮：前驱来源位置
 * - hover 高亮：鼠标悬停时的链节点
 *
 * @param options - 渲染选项
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
        /* 判断当前位置的高亮状态 */
        const isHighlight = pos === highlightPos
        const isSecondaryHighlight =
          secondaryHighlightValue !== undefined &&
          secondaryHighlightValue >= 0 &&
          value === secondaryHighlightValue
        const isHovered = hoveredPositions?.includes(pos)

        /* 根据高亮状态组合类名 */
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

        /* 非末尾元素后添加逗号分隔符 */
        return pos < array.length - 1 ? [content, ', '] : content
      })}
      ]
    </>
  )
}
