/**
 * 链视图显示区域子组件。
 *
 * @remarks
 * 显示所有前驱链的可视化视图，支持节点高亮和 hover 交互。
 * 每条链按长度排序、左对齐展示，最右端是当前末尾元素。
 */

import type { StepAction } from '../../types.ts'
import { getNodeClassName } from '../../utils/highlight-utils.ts'
import sharedStyles from '../../styles/shared.module.css'
import styles from '../../styles/sequence-graph.module.css'
import type { SetupComponent } from '@/index.ts'

const mergedStyles = { ...sharedStyles, ...styles }

/**
 * ChainView 组件的 props 定义。
 */
export interface ChainViewProps {
  /** 所有链（每条链是索引数组） */
  chains: number[][]
  /** 变更节点映射：chainIndex → 变更的节点索引集合 */
  changedNodesByChain: Map<number, Set<number>>
  /** 高亮前驱索引（-1 表示无高亮） */
  highlightPredIndex: number
  /** 是否为链操作（append/replace） */
  isChainAction: boolean
  /** Sequence 区域是否被 hover */
  isSequenceHovered: boolean
  /** Predecessors 区域是否被 hover */
  isPredecessorsHovered?: boolean
  /** 输入数组 */
  input: number[]
  /** Predecessors 数组 */
  predecessors: number[]
  /** 操作类型 */
  actionType?: StepAction['type']
  /** 链 hover 进入回调 */
  onChainHover: (chain: number[], chainIndex: number) => void
  /** 链 hover 离开回调 */
  onChainLeave: () => void
}

/**
 * 链视图组件，显示当前时刻的所有前驱链。
 *
 * @remarks
 * - 按长度排序，左对齐展示
 * - 每行对应一个长度，最右端是当前末尾元素
 * - 节点显示 value，下方显示 idx/pred 信息
 * - 支持多种高亮状态：操作高亮、变更高亮、hover 高亮
 */
export const ChainView: SetupComponent<ChainViewProps> = (props) => {
  /**
   * 创建链 hover 进入处理函数。
   *
   * @remarks
   * 返回闭包以捕获当前链和索引，避免在渲染时重复创建。
   */
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
      isSequenceHovered,
      isPredecessorsHovered,
      input,
      predecessors,
      actionType,
      onChainLeave,
    } = props

    return (
      <div class={mergedStyles.chainView}>
        <h3 class={mergedStyles.sectionTitle}>
          Chain View（当前时刻）
          <span class={mergedStyles.sectionHint}>
            （按长度排序，左对齐展示前驱链，每行对应一个长度，最右端是当前末尾元素；节点显示
            value，下方 idx/pred 均为 index）
          </span>
        </h3>
        <div class={mergedStyles.chainsContainer}>
          {chains.map((chain, chainIndex) => {
            /* 判断当前链是否包含高亮前驱节点 */
            const isHighlightChain = highlightPredIndex >= 0 && chain.includes(highlightPredIndex)
            const isPredecessorsHighlightChain = isPredecessorsHovered && isHighlightChain
            const chainClass = isPredecessorsHighlightChain
              ? `${mergedStyles.chain} ${mergedStyles.chainHighlight}`
              : mergedStyles.chain
            const changedNodes = changedNodesByChain.get(chainIndex)

            return (
              <div
                key={chainIndex}
                class={chainClass}
                onMouseEnter={handleChainMouseEnter(chain, chainIndex)}
                onMouseLeave={onChainLeave}
              >
                <div class={mergedStyles.chainNodes}>
                  {chain.flatMap((nodeIndex, i) => {
                    /* 计算节点的各种高亮状态 */
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
                      },
                      mergedStyles,
                    )

                    /* 渲染节点：显示 value、idx 和 pred 信息 */
                    const node = (
                      <div key={`node-${nodeIndex}`} class={nodeClass}>
                        <span class={mergedStyles.nodeValue}>{input[nodeIndex]}</span>
                        <span class={mergedStyles.nodeInfo}>idx:{nodeIndex}</span>
                        <span class={mergedStyles.nodeInfo}>pred:{predecessors[nodeIndex]}</span>
                      </div>
                    )

                    /* 非末尾节点后添加箭头连接符 */
                    if (i < chain.length - 1) {
                      return [
                        node,
                        <span key={`arrow-${nodeIndex}`} class={mergedStyles.chainArrow}>
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
          {chains.length === 0 && <div class={mergedStyles.emptyChain}>（空序列）</div>}
        </div>
      </div>
    )
  }
}
