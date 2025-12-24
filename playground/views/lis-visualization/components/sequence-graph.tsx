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
function renderHighlightedArray(arr: number[], highlightPos: number, highlightClass: string) {
  return (
    <>
      [
      {arr.map((val, pos) => {
        const isHighlight = pos === highlightPos
        const content = (
          <span key={pos} class={isHighlight ? highlightClass : ''}>
            {val}
          </span>
        )

        return pos < arr.length - 1 ? [content, ', '] : content
      })}
      ]
    </>
  )
}

export const SequenceGraph: SetupComponent<SequenceGraphProps> = (props) => {
  return () => {
    const chains = buildAllChains(props.sequence, props.predecessors)
    const { action, previousSequence, previousPredecessors } = props
    const highlightClass = getHighlightClass(action)
    const hasPrevious = previousSequence !== undefined

    // 确定需要高亮的位置
    let highlightSeqPosition = -1
    let highlightPredIndex = -1

    if (action) {
      if (action.type === 'append') {
        highlightSeqPosition = props.sequence.length - 1
        highlightPredIndex = action.index
      } else if (action.type === 'replace') {
        highlightSeqPosition = action.position
        highlightPredIndex = action.index
      }
    }

    // 计算变化指示器
    const seqChangeIndicator = getSeqChangeIndicator(action, hasPrevious)

    // 比较 predecessors 是否真的有变化
    let predChangeIndicator = ''

    if (hasPrevious && previousPredecessors) {
      const predChanged = props.predecessors.some((val, idx) => val !== previousPredecessors[idx])

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
          <div class={styles.sectionTitle}>Sequence State:</div>
          <div class={styles.stateCompareGrid}>
            {/* 上一步行 */}
            {hasPrevious && (
              <div class={`${styles.stateRow} ${styles.previousRow}`}>
                <span class={styles.stateRowLabel}>上一步:</span>
                <code class={styles.stateCode}>
                  {renderHighlightedArray(previousSequence!, -1, '')}
                </code>
                <code class={styles.stateCode}>
                  → values:{' '}
                  {renderHighlightedArray(
                    previousSequence!.map((idx) => props.input[idx]),
                    -1,
                    '',
                  )}
                </code>
                <span class={styles.changeIndicator}></span>
              </div>
            )}
            {/* 当前行 */}
            <div class={styles.stateRow}>
              <span class={styles.stateRowLabel}>{hasPrevious ? '当前:' : ''}</span>
              <code class={styles.stateCode}>
                {renderHighlightedArray(props.sequence, highlightSeqPosition, highlightClass)}
              </code>
              <code class={styles.stateCode}>
                → values:{' '}
                {renderHighlightedArray(
                  props.sequence.map((idx) => props.input[idx]),
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
          <div class={styles.sectionTitle}>Predecessors:</div>
          <div class={styles.stateCompareGrid}>
            {/* 上一步行 */}
            {hasPrevious && (
              <div class={`${styles.stateRow} ${styles.previousRow}`}>
                <span class={styles.stateRowLabel}>上一步:</span>
                <code class={styles.stateCode}>
                  {renderHighlightedArray(previousPredecessors!, -1, '')}
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
          <h3 class={styles.sectionTitle}>Chain View（当前时刻）</h3>
          <div class={styles.chainsContainer}>
            {chains.map((chain, chainIndex) => {
              const isHighlightChain = highlightPredIndex >= 0 && chain.includes(highlightPredIndex)

              return (
                <div key={chainIndex} class={styles.chain}>
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
