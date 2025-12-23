/**
 * LIS 算法可视化 - 序列状态图组件
 *
 * 显示 Sequence State、Predecessors 数组和 Chain View
 */

import type { SetupComponent } from '@/index.ts'
import styles from '../styles/visualization.module.css'

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
  return sequence.map((index) => buildChain(index, predecessors))
}

export const SequenceGraph: SetupComponent<SequenceGraphProps> = (props) => {
  return () => {
    const { input, sequence, predecessors } = props
    const chains = buildAllChains(sequence, predecessors)

    return (
      <div class={styles.sequenceGraph}>
        {/* Sequence State */}
        <div class={styles.sequenceSection}>
          <h3 class={styles.sectionTitle}>
            Sequence State: [{sequence.join(', ')}] → values: [
            {sequence.map((idx) => input[idx]).join(', ')}]
          </h3>
        </div>

        {/* Predecessors */}
        <div class={styles.predecessorsSection}>
          <h3 class={styles.sectionTitle}>Predecessors: [{predecessors.join(', ')}]</h3>
        </div>

        {/* Chain View */}
        <div class={styles.chainView}>
          <h3 class={styles.sectionTitle}>Chain View（当前时刻）</h3>
          <div class={styles.chainsContainer}>
            {chains.map((chain, chainIndex) => (
              <div key={chainIndex} class={styles.chain}>
                <span class={styles.chainLabel}>Chain {chainIndex + 1} (length: {chain.length}):</span>
                <div class={styles.chainNodes}>
                  {chain.map((nodeIndex, i) => (
                    <>
                      <div key={nodeIndex} class={styles.chainNode}>
                        <span class={styles.nodeValue}>{input[nodeIndex]}</span>
                        <span class={styles.nodeInfo}>idx:{nodeIndex}</span>
                        <span class={styles.nodeInfo}>pred:{predecessors[nodeIndex]}</span>
                      </div>
                      {i < chain.length - 1 && <span class={styles.chainArrow}>←</span>}
                    </>
                  ))}
                </div>
              </div>
            ))}
            {chains.length === 0 && <div class={styles.emptyChain}>（空序列）</div>}
          </div>
        </div>
      </div>
    )
  }
}
