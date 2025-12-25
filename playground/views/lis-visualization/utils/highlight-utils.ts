/**
 * 高亮计算工具函数
 *
 * 提供 LIS 算法可视化中高亮类名计算相关的纯函数。
 * 根据当前步骤的操作类型（init/append/replace/skip）计算对应的 CSS 类名，
 * 用于在 UI 中高亮显示算法执行过程中的关键元素。
 */

import type { StepAction } from '../types.ts'

/**
 * 高亮状态，描述当前步骤中需要高亮的位置信息。
 */
export interface HighlightState {
  /** Sequence 数组中需要高亮的位置索引 */
  highlightSeqPosition: number
  /** Predecessors 数组中需要高亮的索引 */
  highlightPredIndex: number
  /** 上一步 Sequence 中被替换的位置（仅 replace 操作有效） */
  previousHighlightSeqPosition: number
}

/**
 * 前驱高亮信息，描述前驱指针的变化。
 */
export interface PredecessorHighlight {
  /** 当前前驱值（-1 表示无前驱） */
  predecessorValue: number | undefined
  /** 上一步的前驱值（用于显示变化） */
  previousPredecessorValue: number | undefined
}

/**
 * 节点类名计算选项，包含节点的各种状态标志。
 */
export interface NodeClassNameOptions {
  /** 是否为链尾高亮（当前处理的元素） */
  isChainTailHighlight: boolean
  /** 是否为高亮节点（主要高亮） */
  isHighlightNode: boolean
  /** 是否为变更节点（次要高亮） */
  isChangedNode: boolean
  /** 当前步骤的操作类型 */
  actionType: StepAction['type'] | undefined
}

/**
 * 根据操作类型获取主高亮类名。
 *
 * @remarks
 * 不同操作类型对应不同的视觉样式：
 * - `init`：无高亮
 * - `append`：追加操作高亮（通常为绿色）
 * - `replace`：替换操作高亮（通常为橙色）
 * - `skip`：跳过操作高亮（通常为灰色）
 *
 * @param action - 步骤操作
 * @param styles - CSS 模块样式对象
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
 * 根据操作类型获取次要高亮类名。
 *
 * @remarks
 * 次要高亮用于显示与主高亮相关联的元素，如前驱链中的其他节点。
 * 仅 `append` 和 `replace` 操作有次要高亮。
 *
 * @param action - 步骤操作
 * @param styles - CSS 模块样式对象
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
 * 获取 sequence 变更指示器文本。
 *
 * @remarks
 * 在 UI 中显示当前步骤对 sequence 数组的影响，帮助用户理解算法行为。
 *
 * @param action - 步骤操作
 * @param hasPrevious - 是否有上一步（用于判断是否显示变化信息）
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
 * 计算高亮状态。
 *
 * @remarks
 * 根据当前步骤的操作类型，计算需要高亮的位置信息：
 * - `append`：高亮 sequence 末尾和新增元素的索引
 * - `replace`：高亮被替换的位置和替换元素的索引
 *
 * @param action - 步骤操作
 * @param sequence - 当前 sequence 数组
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
 * 计算前驱高亮信息。
 *
 * @remarks
 * 提取当前高亮元素的前驱值，用于在 UI 中显示前驱指针的变化。
 *
 * @param highlightPredIndex - 高亮前驱索引
 * @param predecessors - 前驱数组
 * @param action - 步骤操作
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
 * 计算前驱变更指示器文本。
 *
 * @remarks
 * 比较当前前驱数组与上一步前驱数组，生成描述变化的文本。
 *
 * @param hasPrevious - 是否有上一步
 * @param previousPredecessors - 上一步前驱数组
 * @param highlightPredIndex - 高亮前驱索引
 * @param predecessors - 当前前驱数组
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
 * 获取链节点的 CSS 类名。
 *
 * @remarks
 * 根据节点的各种状态标志，组合生成最终的 CSS 类名。
 * 优先级：链尾高亮 > 主高亮 > 变更高亮 > 默认样式。
 *
 * @param options - 节点状态选项
 * @param styles - CSS 模块样式对象
 * @returns CSS 类名
 */
export function getNodeClassName(
  options: NodeClassNameOptions,
  styles: Record<string, string>,
): string {
  const { isChainTailHighlight, isHighlightNode, isChangedNode, actionType } = options

  if (isChainTailHighlight) {
    return `${styles.chainNode} ${styles.chainNodeTailHighlight}`
  }

  if (isHighlightNode) {
    /* 使用 chain 节点专用的高亮类名 */
    const chainHighlightClass = getChainNodeHighlightClass(actionType, styles)

    return `${styles.chainNode} ${chainHighlightClass}`
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

/**
 * 根据操作类型获取链节点的高亮类名。
 *
 * @remarks
 * 链节点使用专用的高亮类名（chainNodeHighlightAppend 等），
 * 与文本高亮类名（highlightAppend 等）分开，避免 CSS 模块命名冲突。
 *
 * @param actionType - 操作类型
 * @param styles - CSS 模块样式对象
 * @returns CSS 类名
 */
export function getChainNodeHighlightClass(
  actionType: StepAction['type'] | undefined,
  styles: Record<string, string>,
): string {
  switch (actionType) {
    case 'append': {
      return styles.chainNodeHighlightAppend
    }

    case 'replace': {
      return styles.chainNodeHighlightReplace
    }

    case 'skip': {
      return styles.chainNodeHighlightSkip
    }

    case 'init': {
      return ''
    }

    case undefined: {
      return ''
    }
  }
}
