/**
 * LIS 算法可视化 - 序列状态图组件
 *
 * 显示 Sequence State、Predecessors 数组和 Chain View
 */

import styles from '../styles/visualization.module.css'
import type { SetupComponent } from '@/index.ts'

export interface SequenceGraphProps {
  /** 输入数组 */
  input: number[]
  /** 当前序列状态（索引列表） */
  sequence: number[]
  /** 前驱数组 */
  predecessors: number[]
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

export const SequenceGraph: SetupComponent<SequenceGraphProps> = (props) => {
  return () => {
    const chains = buildAllChains(props.sequence, props.predecessors)

    return (
      <div class={styles.sequenceGraph}>
        {/* Sequence State */}
        <div class={styles.sequenceSection}>
          <h3 class={styles.sectionTitle}>
            Sequence State: [{props.sequence.join(', ')}] → values: [
            {props.sequence
              .map((idx) => {
                return props.input[idx]
              })
              .join(', ')}
            ]
          </h3>
        </div>

        {/* Predecessors */}
        <div class={styles.predecessorsSection}>
          <h3 class={styles.sectionTitle}>Predecessors: [{props.predecessors.join(', ')}]</h3>
        </div>

        {/* Chain View */}
        <div class={styles.chainView}>
          <h3 class={styles.sectionTitle}>Chain View（当前时刻）</h3>
          <div class={styles.chainsContainer}>
            {chains.map((chain, chainIndex) => {
              return (
                <div key={chainIndex} class={styles.chain}>
                  <span class={styles.chainLabel}>
                    Chain {chainIndex + 1} (length: {chain.length}):
                  </span>
                  <div class={styles.chainNodes}>
                    {chain.flatMap((nodeIndex, i) => {
                      const node = (
                        <div key={`node-${nodeIndex}`} class={styles.chainNode}>
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
