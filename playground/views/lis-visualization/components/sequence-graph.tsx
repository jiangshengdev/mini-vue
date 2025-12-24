/**
 * LIS 算法可视化 - 序列状态图组件
 *
 * 显示 Sequence State、Predecessors 数组和 Chain View
 * 支持上一步与当前步骤的状态对比
 */

import type { StepAction } from '../types'
import styles from '../styles/visualization.module.css'
import type { SetupComponent } from '@/index.ts'

export interface SequenceGraphProps {
  /** 输入数组 */
  input: number[]
  /** 当前序列状态（索引列表） */
  sequence: number[]
  /** 前驱数组 */
  predecessors: number[]
  /** 当前操作（用于高亮显示改动） */
  action?: StepAction
  /** 上一步的序列状态（用于对比） */
  previousSequence?: number[]
  /** 上一步的前驱数组（用于对比） */
  previousPredecessors?: number[]
  /** Hover 高亮的索引列表 */
  hoveredIndexes?: number[]
  /** 链 hover 回调 */
  onChainHover?: (indexes: number[], chainIndex: number) => void
  /** 链 leave 回调 */
  onChainLeave?: () => void
  /** Sequence State 模块是否被 hover */
  isSequenceHovered?: boolean
  /** Sequence State hover 回调 */
  onSequenceHover?: () => void
  /** Sequence State leave 回调 */
  onSequenceLeave?: () => void
  /** Predecessors 模块是否被 hover */
  isPredecessorsHovered?: boolean
  /** Predecessors hover 回调 */
  onPredecessorsHover?: () => void
  /** Predecessors leave 回调 */
  onPredecessorsLeave?: () => void
}

/** 从 sequence 中的索引回溯 predecessors 构建链 */
function buildChain(startIndex: number, predecessors: number[]): number[] {
  const chain: number[] = []
  let current = startIndex

  while (current >= 0) {
    chain.unshift(current)
    current = predecessors[current]
  }

  return chain
}

/** 获取当前时刻的所有链表 */
function buildAllChains(sequence: number[], predecessors: number[]): number[][] {
  return sequence.map((index) => {
    return buildChain(index, predecessors)
  })
}

/** 根据操作类型获取高亮样式类名 */
function getHighlightClass(action: StepAction | undefined): string {
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

/** 根据操作类型获取半高亮样式类名（用于前驱来源） */
function getSecondaryHighlightClass(action: StepAction | undefined): string {
  if (!action || action.type === 'init' || action.type === 'skip') {
    return ''
  }

  if (action.type === 'append') {
    return styles.highlightSecondaryAppend
  }

  return styles.highlightSecondaryReplace
}

/** 计算 Sequence 变化指示器文本 */
function getSeqChangeIndicator(action: StepAction | undefined, hasPrevious: boolean): string {
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

/** 渲染带高亮的数组参数 */
interface RenderHighlightedArrayOptions {
  array: number[]
  highlightPos: number
  highlightClass: string
  secondaryHighlightValue?: number
  secondaryHighlightClass?: string
  hoveredPositions?: number[]
}

/** 渲染带高亮的数组 */
function renderHighlightedArray(options: RenderHighlightedArrayOptions) {
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
        // 半高亮：值等于前驱索引（用于显示 Sequence 中的前驱来源）
        const isSecondaryHighlight =
          secondaryHighlightValue !== undefined &&
          secondaryHighlightValue >= 0 &&
          value === secondaryHighlightValue
        // Hover 高亮：位置在 hoveredPositions 中
        const isHovered = hoveredPositions?.includes(pos)

        const classes: string[] = []

        if (isHighlight) {
          // 已有高亮背景，hover 时用紫色背景覆盖
          if (isHovered) {
            classes.push(styles.highlightHover)
          } else {
            classes.push(highlightClass)
          }
        } else if (isSecondaryHighlight && secondaryHighlightClass) {
          classes.push(secondaryHighlightClass)
        } else if (isHovered) {
          // 普通位置，hover 时只改字体颜色
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

export const SequenceGraph: SetupComponent<SequenceGraphProps> = (props) => {
  const handleChainMouseEnter = (chain: number[], chainIndex: number) => {
    return () => {
      props.onChainHover?.(chain, chainIndex)
    }
  }

  const handleChainMouseLeave = () => {
    props.onChainLeave?.()
  }

  const handleSequenceMouseEnter = () => {
    props.onSequenceHover?.()
  }

  const handleSequenceMouseLeave = () => {
    props.onSequenceLeave?.()
  }

  const handlePredecessorsMouseEnter = () => {
    props.onPredecessorsHover?.()
  }

  const handlePredecessorsMouseLeave = () => {
    props.onPredecessorsLeave?.()
  }

  return () => {
    const chains = buildAllChains(props.sequence, props.predecessors)
    const { action, previousSequence, previousPredecessors } = props
    const highlightClass = getHighlightClass(action)
    const secondaryHighlightClass = getSecondaryHighlightClass(action)
    const hasPrevious = previousSequence !== undefined

    // 确定需要高亮的位置
    let highlightSeqPosition = -1
    let highlightPredIndex = -1
    // 上一步行：替换操作时高亮被替换的位置
    let previousHighlightSeqPosition = -1

    if (action) {
      if (action.type === 'append') {
        highlightSeqPosition = props.sequence.length - 1
        highlightPredIndex = action.index
        // 追加操作：上一步不高亮
        previousHighlightSeqPosition = -1
      } else if (action.type === 'replace') {
        highlightSeqPosition = action.position
        highlightPredIndex = action.index
        // 替换操作：上一步高亮被替换的位置
        previousHighlightSeqPosition = action.position
      }
    }

    // 计算变化指示器
    const seqChangeIndicator = getSeqChangeIndicator(action, hasPrevious)

    // 计算前驱值（用于 Sequence State 的半高亮）
    // 当 Predecessors 变化且值不为 -1 时，在 Sequence 中半高亮该前驱索引
    let predecessorValue: number | undefined
    let previousPredecessorValue: number | undefined

    if (highlightPredIndex >= 0) {
      const predValue = props.predecessors[highlightPredIndex]

      if (predValue >= 0) {
        predecessorValue = predValue
      }
    }

    // 替换/追加操作时，为上一步行添加与当前相同的前驱半高亮，保持上下对齐
    if (
      (action?.type === 'replace' || action?.type === 'append') &&
      predecessorValue !== undefined
    ) {
      previousPredecessorValue = predecessorValue
    }

    // 比较 predecessors 是否真的有变化
    let predChangeIndicator = ''

    if (hasPrevious && previousPredecessors) {
      const predChanged = props.predecessors.some((value, idx) => {
        return value !== previousPredecessors[idx]
      })

      if (predChanged && highlightPredIndex >= 0) {
        predChangeIndicator = `← 位置 ${highlightPredIndex} 变化`
      } else if (!predChanged) {
        predChangeIndicator = '（无变化）'
      }
    }

    return (
      <div class={styles.sequenceGraph}>
        {/* Sequence State - CSS Grid 4列布局 */}
        <div
          class={styles.stateCompareSection}
          onMouseEnter={handleSequenceMouseEnter}
          onMouseLeave={handleSequenceMouseLeave}
        >
          <div class={styles.sectionTitle}>
            Sequence State:
            <span class={styles.sectionHint}>（存储的是 index，→ 后显示对应 value）</span>
          </div>
          <div class={styles.stateCompareGrid}>
            {/* 上一步行 */}
            {hasPrevious && (
              <div class={`${styles.stateRow} ${styles.previousRow}`}>
                <span class={styles.stateRowLabel}>上一步:</span>
                <code class={styles.stateCode}>
                  {renderHighlightedArray({
                    array: previousSequence,
                    highlightPos: previousHighlightSeqPosition,
                    highlightClass: styles.highlightPrevious,
                    secondaryHighlightValue: previousPredecessorValue,
                    secondaryHighlightClass: styles.highlightPreviousSecondary,
                  })}
                </code>
                <code class={styles.stateCode}>
                  → values:{' '}
                  {renderHighlightedArray({
                    array: previousSequence.map((idx) => {
                      return props.input[idx]
                    }),
                    highlightPos: previousHighlightSeqPosition,
                    highlightClass: styles.highlightPrevious,
                  })}
                </code>
                <span class={styles.changeIndicator}></span>
              </div>
            )}
            {/* 当前行 */}
            <div class={styles.stateRow}>
              <span class={styles.stateRowLabel}>{hasPrevious ? '当前:' : ''}</span>
              <code class={styles.stateCode}>
                {renderHighlightedArray({
                  array: props.sequence,
                  highlightPos: highlightSeqPosition,
                  highlightClass,
                  secondaryHighlightValue: predecessorValue,
                  secondaryHighlightClass,
                })}
              </code>
              <code class={styles.stateCode}>
                → values:{' '}
                {renderHighlightedArray({
                  array: props.sequence.map((idx) => {
                    return props.input[idx]
                  }),
                  highlightPos: highlightSeqPosition,
                  highlightClass,
                })}
              </code>
              <span class={styles.changeIndicator}>{seqChangeIndicator}</span>
            </div>
          </div>
        </div>

        {/* Predecessors - CSS Grid 4列布局 */}
        <div
          class={styles.stateCompareSection}
          onMouseEnter={handlePredecessorsMouseEnter}
          onMouseLeave={handlePredecessorsMouseLeave}
        >
          <div class={styles.sectionTitle}>
            Predecessors:
            <span class={styles.sectionHint}>（每个位置存储前驱元素的 index，-1 表示无前驱）</span>
          </div>
          <div class={styles.stateCompareGrid}>
            {/* 上一步行 */}
            {hasPrevious && (
              <div class={`${styles.stateRow} ${styles.previousRow}`}>
                <span class={styles.stateRowLabel}>上一步:</span>
                <code class={styles.stateCode}>
                  {renderHighlightedArray({
                    array: previousPredecessors!,
                    highlightPos: highlightPredIndex,
                    highlightClass: styles.highlightPrevious,
                  })}
                </code>
                <span></span>
                <span class={styles.changeIndicator}></span>
              </div>
            )}
            {/* 当前行 */}
            <div class={styles.stateRow}>
              <span class={styles.stateRowLabel}>{hasPrevious ? '当前:' : ''}</span>
              <code class={styles.stateCode}>
                {renderHighlightedArray({
                  array: props.predecessors,
                  highlightPos: highlightPredIndex,
                  highlightClass,
                  hoveredPositions: props.hoveredIndexes,
                })}
              </code>
              <span></span>
              <span class={styles.changeIndicator}>{predChangeIndicator}</span>
            </div>
          </div>
        </div>

        {/* Chain View */}
        <div class={styles.chainView}>
          <h3 class={styles.sectionTitle}>
            Chain View（当前时刻）
            <span class={styles.sectionHint}>（节点显示 value，下方 idx/pred 均为 index）</span>
          </h3>
          <div class={styles.chainsContainer}>
            {chains.map((chain, chainIndex) => {
              const isHighlightChain = highlightPredIndex >= 0 && chain.includes(highlightPredIndex)
              // 当 Predecessors 被 hover 时，高亮包含当前操作索引的链
              const isPredecessorsHighlightChain = props.isPredecessorsHovered && isHighlightChain

              const chainClass = isPredecessorsHighlightChain
                ? `${styles.chain} ${styles.chainHighlight}`
                : styles.chain

              return (
                <div
                  key={chainIndex}
                  class={chainClass}
                  onMouseEnter={handleChainMouseEnter(chain, chainIndex)}
                  onMouseLeave={handleChainMouseLeave}
                >
                  <div class={styles.chainNodes}>
                    {chain.flatMap((nodeIndex, i) => {
                      const isHighlightNode = isHighlightChain && nodeIndex === highlightPredIndex
                      const isLastNode = i === chain.length - 1
                      // 当 Sequence State 被 hover 时，高亮链尾节点
                      const isChainTailHighlight = props.isSequenceHovered && isLastNode

                      let nodeClass = styles.chainNode

                      if (isChainTailHighlight) {
                        nodeClass = `${styles.chainNode} ${styles.chainNodeTailHighlight}`
                      } else if (isHighlightNode) {
                        nodeClass = `${styles.chainNode} ${highlightClass}`
                      }

                      const node = (
                        <div key={`node-${nodeIndex}`} class={nodeClass}>
                          <span class={styles.nodeValue}>{props.input[nodeIndex]}</span>
                          <span class={styles.nodeInfo}>idx:{nodeIndex}</span>
                          <span class={styles.nodeInfo}>pred:{props.predecessors[nodeIndex]}</span>
                        </div>
                      )

                      if (i < chain.length - 1) {
                        return [
                          node,
                          <span key={`arrow-${nodeIndex}`} class={styles.chainArrow}>
                            ←
                          </span>,
                        ]
                      }

                      return [node]
                    })}
                  </div>
                </div>
              )
            })}
            {chains.length === 0 && <div class={styles.emptyChain}>（空序列）</div>}
          </div>
        </div>
      </div>
    )
  }
}
