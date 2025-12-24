/**
 * LIS 算法可视化 - 序列状态图组件
 *
 * 显示 Sequence State、Predecessors 数组和 Chain View
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
  if (!action) return ''

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

export const SequenceGraph: SetupComponent<SequenceGraphProps> = (props) => {
  return () => {
    const chains = buildAllChains(props.sequence, props.predecessors)
    const { action } = props
    const highlightClass = getHighlightClass(action)

    // 确定需要高亮的位置
    let highlightSeqPosition = -1 // sequence 数组中的位置
    let highlightPredIndex = -1 // predecessors 数组中的索引

    if (action) {
      if (action.type === 'append') {
        highlightSeqPosition = props.sequence.length - 1
        highlightPredIndex = action.index
      } else if (action.type === 'replace') {
        highlightSeqPosition = action.position
        highlightPredIndex = action.index
      }
    }

    return (
      <div class={styles.sequenceGraph}>
        {/* Sequence State */}
        <div class={styles.sequenceSection}>
          <span class={styles.stateLabel}>Sequence State:</span>
          <code class={styles.stateCode}>
            [
            {props.sequence.map((idx, pos) => {
              const isHighlight = pos === highlightSeqPosition
              const content = (
                <span key={pos} class={isHighlight ? highlightClass : ''}>
                  {idx}
                </span>
              )

              return pos < props.sequence.length - 1 ? [content, ', '] : content
            })}
            ] → values: [
            {props.sequence.map((idx, pos) => {
              const isHighlight = pos === highlightSeqPosition
              const content = (
                <span key={pos} class={isHighlight ? highlightClass : ''}>
                  {props.input[idx]}
                </span>
              )

              return pos < props.sequence.length - 1 ? [content, ', '] : content
            })}
            ]
          </code>
        </div>

        {/* Predecessors */}
        <div class={styles.predecessorsSection}>
          <span class={styles.stateLabel}>Predecessors:</span>
          <code class={styles.stateCode}>
            [
            {props.predecessors.map((pred, idx) => {
              const isHighlight = idx === highlightPredIndex
              const content = (
                <span key={idx} class={isHighlight ? highlightClass : ''}>
                  {pred}
                </span>
              )

              return idx < props.predecessors.length - 1 ? [content, ', '] : content
            })}
            ]
          </code>
        </div>

        {/* Chain View */}
        <div class={styles.chainView}>
          <h3 class={styles.sectionTitle}>Chain View（当前时刻）</h3>
          <div class={styles.chainsContainer}>
            {chains.map((chain, chainIndex) => {
              // 判断这条链是否包含当前操作的索引
              const isHighlightChain =
                highlightPredIndex >= 0 && chain.includes(highlightPredIndex)

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
