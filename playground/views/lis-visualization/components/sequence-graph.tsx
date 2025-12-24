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
  /** 链 hover 回调 */
  onChainHover?: (indexes: number[]) => void
  /** 链 leave 回调 */
  onChainLeave?: () => void
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

/** 渲染带高亮的数组 */
function renderHighlightedArray(
  array: number[],
  highlightPos: number,
  highlightClass: string,
  secondaryHighlightValue?: number,
  secondaryHighlightClass?: string,
) {
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

        let className = ''

        if (isHighlight) {
          className = highlightClass
        } else if (isSecondaryHighlight && secondaryHighlightClass) {
          className = secondaryHighlightClass
        }

        const content = (
          <span key={pos} class={className}>
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
  const handleChainMouseEnter = (chain: number[]) => {
    return () => {
      props.onChainHover?.(chain)
    }
  }

  const handleChainMouseLeave = () => {
    props.onChainLeave?.()
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

    if (highlightPredIndex >= 0) {
      const predValue = props.predecessors[highlightPredIndex]

      if (predValue >= 0) {
        predecessorValue = predValue
      }
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
        <div class={styles.stateCompareSection}>
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
                  {renderHighlightedArray(
                    previousSequence,
                    previousHighlightSeqPosition,
                    styles.highlightPrevious,
                  )}
                </code>
                <code class={styles.stateCode}>
                  → values:{' '}
                  {renderHighlightedArray(
                    previousSequence.map((idx) => {
                      return props.input[idx]
                    }),
                    previousHighlightSeqPosition,
                    styles.highlightPrevious,
                  )}
                </code>
                <span class={styles.changeIndicator}></span>
              </div>
            )}
            {/* 当前行 */}
            <div class={styles.stateRow}>
              <span class={styles.stateRowLabel}>{hasPrevious ? '当前:' : ''}</span>
              <code class={styles.stateCode}>
                {renderHighlightedArray(
                  props.sequence,
                  highlightSeqPosition,
                  highlightClass,
                  predecessorValue,
                  secondaryHighlightClass,
                )}
              </code>
              <code class={styles.stateCode}>
                → values:{' '}
                {renderHighlightedArray(
                  props.sequence.map((idx) => {
                    return props.input[idx]
                  }),
                  highlightSeqPosition,
                  highlightClass,
                )}
              </code>
              <span class={styles.changeIndicator}>{seqChangeIndicator}</span>
            </div>
          </div>
        </div>

        {/* Predecessors - CSS Grid 4列布局 */}
        <div class={styles.stateCompareSection}>
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
                  {renderHighlightedArray(
                    previousPredecessors!,
                    highlightPredIndex,
                    styles.highlightPrevious,
                  )}
                </code>
                <span></span>
                <span class={styles.changeIndicator}></span>
              </div>
            )}
            {/* 当前行 */}
            <div class={styles.stateRow}>
              <span class={styles.stateRowLabel}>{hasPrevious ? '当前:' : ''}</span>
              <code class={styles.stateCode}>
                {renderHighlightedArray(props.predecessors, highlightPredIndex, highlightClass)}
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

              return (
                <div
                  key={chainIndex}
                  class={styles.chain}
                  onMouseEnter={handleChainMouseEnter(chain)}
                  onMouseLeave={handleChainMouseLeave}
                >
                  <span class={styles.chainLabel}>
                    Chain {chainIndex + 1}（长度：{chain.length}）
                  </span>
                  <div class={styles.chainNodes}>
                    {chain.flatMap((nodeIndex, i) => {
                      const isHighlightNode = isHighlightChain && nodeIndex === highlightPredIndex
                      const nodeClass = isHighlightNode
                        ? `${styles.chainNode} ${highlightClass}`
                        : styles.chainNode

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
