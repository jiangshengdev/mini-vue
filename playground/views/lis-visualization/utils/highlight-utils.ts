/**
 * 高亮计算工具函数
 *
 * 提供 LIS 算法可视化中高亮类名计算相关的纯函数
 */

import type { StepAction } from '../types.ts'

/** 高亮状态 */
export interface HighlightState {
  /** Sequence 高亮位置 */
  highlightSeqPosition: number
  /** Predecessors 高亮索引 */
  highlightPredIndex: number
  /** 上一步 Sequence 高亮位置 */
  previousHighlightSeqPosition: number
}

/** 前驱高亮信息 */
export interface PredecessorHighlight {
  /** 前驱值 */
  predecessorValue: number | undefined
  /** 上一步前驱值 */
  previousPredecessorValue: number | undefined
}

/** 节点类名计算选项 */
export interface NodeClassNameOptions {
  /** 是否为链尾高亮 */
  isChainTailHighlight: boolean
  /** 是否为高亮节点 */
  isHighlightNode: boolean
  /** 是否为变更节点 */
  isChangedNode: boolean
  /** 操作类型 */
  actionType: StepAction['type'] | undefined
  /** 高亮类名 */
  highlightClass: string
}

/**
 * 根据操作类型获取主高亮类名
 *
 * @param action 步骤操作
 * @param styles CSS 模块样式对象
 * @returns CSS 类名
 */
export function getHighlightClass(
  action: StepAction | undefined,
  styles: Record<string, string>,
): string {
  if (!action) {
    return ''
  }

  switch (action.type) {
    case 'init': {
      return ''
    }

    case 'append': {
      return styles.highlightAppend
    }

    case 'replace': {
      return styles.highlightReplace
    }

    case 'skip': {
      return styles.highlightSkip
    }
  }
}

/**
 * 根据操作类型获取半高亮类名
 *
 * @param action 步骤操作
 * @param styles CSS 模块样式对象
 * @returns CSS 类名
 */
export function getSecondaryHighlightClass(
  action: StepAction | undefined,
  styles: Record<string, string>,
): string {
  if (!action || action.type === 'init' || action.type === 'skip') {
    return ''
  }

  return action.type === 'append'
    ? styles.highlightSecondaryAppend
    : styles.highlightSecondaryReplace
}

/**
 * 获取 sequence 变更指示器文本
 *
 * @param action 步骤操作
 * @param hasPrevious 是否有上一步
 * @returns 指示器文本
 */
export function getSeqChangeIndicator(
  action: StepAction | undefined,
  hasPrevious: boolean,
): string {
  if (!hasPrevious) {
    return ''
  }

  if (!action) {
    return '（无变化）'
  }

  switch (action.type) {
    case 'init': {
      return ''
    }

    case 'append': {
      return '← 追加'
    }

    case 'replace': {
      return `← 替换位置 ${action.position}`
    }

    case 'skip': {
      return '（无变化）'
    }
  }
}

/**
 * 计算高亮状态
 *
 * @param action 步骤操作
 * @param sequence 当前 sequence
 * @returns 高亮位置信息
 */
export function computeHighlightState(
  action: StepAction | undefined,
  sequence: number[],
): HighlightState {
  let highlightSeqPosition = -1
  let highlightPredIndex = -1
  let previousHighlightSeqPosition = -1

  if (action?.type === 'append') {
    highlightSeqPosition = sequence.length - 1
    highlightPredIndex = action.index
  } else if (action?.type === 'replace') {
    highlightSeqPosition = action.position
    highlightPredIndex = action.index
    previousHighlightSeqPosition = action.position
  }

  return { highlightSeqPosition, highlightPredIndex, previousHighlightSeqPosition }
}

/**
 * 计算前驱高亮信息
 *
 * @param highlightPredIndex 高亮前驱索引
 * @param predecessors 前驱数组
 * @param action 步骤操作
 * @returns 前驱值信息
 */
export function computePredecessorHighlight(
  highlightPredIndex: number,
  predecessors: number[],
  action: StepAction | undefined,
): PredecessorHighlight {
  let predecessorValue: number | undefined
  let previousPredecessorValue: number | undefined

  if (highlightPredIndex >= 0) {
    const predValue = predecessors[highlightPredIndex]

    if (predValue >= 0) {
      predecessorValue = predValue
    }
  }

  if ((action?.type === 'replace' || action?.type === 'append') && predecessorValue !== undefined) {
    previousPredecessorValue = predecessorValue
  }

  return { predecessorValue, previousPredecessorValue }
}

/**
 * 计算前驱变更指示器文本
 *
 * @param hasPrevious 是否有上一步
 * @param previousPredecessors 上一步前驱数组
 * @param highlightPredIndex 高亮前驱索引
 * @param predecessors 当前前驱数组
 * @returns 指示器文本
 */
export function computePredChangeIndicator(
  hasPrevious: boolean,
  previousPredecessors: number[] | undefined,
  highlightPredIndex: number,
  predecessors: number[],
): string {
  if (hasPrevious && previousPredecessors) {
    const predChanged = predecessors.some((value, idx) => {
      return value !== previousPredecessors[idx]
    })

    if (predChanged && highlightPredIndex >= 0) {
      return `← 位置 ${highlightPredIndex} 变化`
    }

    if (!predChanged) {
      return '（无变化）'
    }
  }

  return ''
}

/**
 * 获取链节点的 CSS 类名
 *
 * @param options 节点状态选项
 * @param styles CSS 模块样式对象
 * @returns CSS 类名
 */
export function getNodeClassName(
  options: NodeClassNameOptions,
  styles: Record<string, string>,
): string {
  const { isChainTailHighlight, isHighlightNode, isChangedNode, actionType, highlightClass } =
    options

  if (isChainTailHighlight) {
    return `${styles.chainNode} ${styles.chainNodeTailHighlight}`
  }

  if (isHighlightNode) {
    return `${styles.chainNode} ${highlightClass}`
  }

  if (isChangedNode) {
    if (actionType === 'append') {
      return `${styles.chainNode} ${styles.chainNodeChangedSecondaryAppend}`
    }

    if (actionType === 'replace') {
      return `${styles.chainNode} ${styles.chainNodeChangedSecondaryReplace}`
    }
  }

  return styles.chainNode
}
