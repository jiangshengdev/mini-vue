/**
 * Chain View 显示区域子组件
 *
 * 显示所有链的可视化视图，支持节点高亮和 hover 交互
 */

import type { SetupComponent } from '@/index.ts'
import type { StepAction } from '../../types.ts'
import { getNodeClassName } from '../../utils/highlight-utils.ts'
import styles from '../../styles/visualization.module.css'

export interface ChainViewProps {
  /** 所有链 */
  chains: number[][]
  /** 变更节点映射 */
  changedNodesByChain: Map<number, Set<number>>
  /** 高亮前驱索引 */
  highlightPredIndex: number
  /** 是否为链操作（append/replace） */
  isChainAction: boolean
  /** 高亮类名 */
  highlightClass: string
  /** Sequence 区域是否被 hover */
  isSequenceHovered: boolean
  /** Predecessors 区域是否被 hover */
  isPredecessorsHovered?: boolean
  /** 输入数组 */
  input: number[]
  /** predecessors 数组 */
  predecessors: number[]
  /** 操作类型 */
  actionType?: StepAction['type']
  /** 链 hover 进入回调 */
  onChainHover: (chain: number[], chainIndex: number) => void
  /** 链 hover 离开回调 */
  onChainLeave: () => void
}

/**
 * Chain View 组件
 *
 * 显示当前时刻的所有前驱链：
 * - 按长度排序，左对齐展示
 * - 每行对应一个长度，最右端是当前末尾元素
 * - 节点显示 value，下方显示 idx/pred 信息
 * - 支持多种高亮状态：操作高亮、变更高亮、hover 高亮
 */
export const ChainView: SetupComponent<ChainViewProps> = (props) => {
  // 创建链 hover 进入处理函数
  const handleChainMouseEnter = (chain: number[], chainIndex: number) => {
    return () => {
      props.onChainHover(chain, chainIndex)
    }
  }

  return () => {
    const {
      chains,
      changedNodesByChain,
      highlightPredIndex,
      isChainAction,
      highlightClass,
      isSequenceHovered,
      isPredecessorsHovered,
      input,
      predecessors,
      actionType,
      onChainLeave,
    } = props

    return (
      <div class={styles.chainView}>
        <h3 class={styles.sectionTitle}>
          Chain View（当前时刻）
          <span class={styles.sectionHint}>
            （按长度排序，左对齐展示前驱链，每行对应一个长度，最右端是当前末尾元素；节点显示
            value，下方 idx/pred 均为 index）
          </span>
        </h3>
        <div class={styles.chainsContainer}>
          {chains.map((chain, chainIndex) => {
            const isHighlightChain = highlightPredIndex >= 0 && chain.includes(highlightPredIndex)
            const isPredecessorsHighlightChain = isPredecessorsHovered && isHighlightChain
            const chainClass = isPredecessorsHighlightChain
              ? `${styles.chain} ${styles.chainHighlight}`
              : styles.chain
            const changedNodes = changedNodesByChain.get(chainIndex)

            return (
              <div
                key={chainIndex}
                class={chainClass}
                onMouseEnter={handleChainMouseEnter(chain, chainIndex)}
                onMouseLeave={onChainLeave}
              >
                <div class={styles.chainNodes}>
                  {chain.flatMap((nodeIndex, i) => {
                    const isHighlightNode = isHighlightChain && nodeIndex === highlightPredIndex
                    const isLastNode = i === chain.length - 1
                    const isChainTailHighlight = isSequenceHovered && isLastNode
                    const isChangedNode =
                      isChainAction &&
                      isHighlightChain &&
                      changedNodes !== undefined &&
                      changedNodes.has(nodeIndex) &&
                      !isHighlightNode
                    const nodeClass = getNodeClassName(
                      {
                        isChainTailHighlight,
                        isHighlightNode,
                        isChangedNode,
                        actionType,
                        highlightClass,
                      },
                      styles,
                    )

                    const node = (
                      <div key={`node-${nodeIndex}`} class={nodeClass}>
                        <span class={styles.nodeValue}>{input[nodeIndex]}</span>
                        <span class={styles.nodeInfo}>idx:{nodeIndex}</span>
                        <span class={styles.nodeInfo}>pred:{predecessors[nodeIndex]}</span>
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
    )
  }
}
