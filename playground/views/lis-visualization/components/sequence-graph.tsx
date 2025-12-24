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
  input: number[]
  sequence: number[]
  predecessors: number[]
  action?: StepAction
  previousSequence?: number[]
  previousPredecessors?: number[]
  hoveredIndexes?: number[]
  onChainHover?: (indexes: number[], chainIndex: number) => void
  onChainLeave?: () => void
  isSequenceHovered?: boolean
  onSequenceHover?: () => void
  onSequenceLeave?: () => void
  isPredecessorsHovered?: boolean
  onPredecessorsHover?: () => void
  onPredecessorsLeave?: () => void
}

function buildChain(startIndex: number, predecessors: number[]): number[] {
  const chain: number[] = []
  let current = startIndex

  while (current >= 0) {
    chain.unshift(current)
    current = predecessors[current]
  }

  return chain
}

function buildAllChains(sequence: number[], predecessors: number[]): number[][] {
  return sequence.map((index) => {
    return buildChain(index, predecessors)
  })
}

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

function getSecondaryHighlightClass(action: StepAction | undefined): string {
  if (!action || action.type === 'init' || action.type === 'skip') {
    return ''
  }

  return action.type === 'append'
    ? styles.highlightSecondaryAppend
    : styles.highlightSecondaryReplace
}

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

interface RenderHighlightedArrayOptions {
  array: number[]
  highlightPos: number
  highlightClass: string
  secondaryHighlightValue?: number
  secondaryHighlightClass?: string
  hoveredPositions?: number[]
}

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
        const isSecondaryHighlight =
          secondaryHighlightValue !== undefined &&
          secondaryHighlightValue >= 0 &&
          value === secondaryHighlightValue
        const isHovered = hoveredPositions?.includes(pos)

        const classes: string[] = []

        if (isHighlight) {
          classes.push(isHovered ? styles.highlightHover : highlightClass)
        } else if (isSecondaryHighlight && secondaryHighlightClass) {
          classes.push(secondaryHighlightClass)
        } else if (isHovered) {
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

function computeChangedNodesByChain(
  chains: number[][],
  previousChains: number[][] | undefined,
  isChainAction: boolean,
  highlightPredIndex: number,
): Map<number, Set<number>> {
  const changed = new Map<number, Set<number>>()

  for (const [chainIndex, chain] of chains.entries()) {
    const previousChain = previousChains?.[chainIndex]
    const nodeSet = new Set<number>()

    if (previousChain) {
      const maxLength = Math.max(chain.length, previousChain.length)

      for (let i = 0; i < maxLength; i += 1) {
        const currentNode = chain[i]
        const previousNode = previousChain[i]

        if (currentNode !== previousNode && currentNode !== undefined) {
          nodeSet.add(currentNode)
        }
      }
    } else if (isChainAction && highlightPredIndex >= 0 && chain.includes(highlightPredIndex)) {
      for (const node of chain) {
        nodeSet.add(node)
      }
    }

    if (nodeSet.size > 0) {
      changed.set(chainIndex, nodeSet)
    }
  }

  return changed
}

function getNodeClassName(options: {
  isChainTailHighlight: boolean
  isHighlightNode: boolean
  isChangedNode: boolean
  actionType: StepAction['type'] | undefined
  highlightClass: string
}): string {
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

function computeHighlightState(action: StepAction | undefined, sequence: number[]) {
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

function computePredecessorHighlight(
  highlightPredIndex: number,
  predecessors: number[],
  action: StepAction | undefined,
) {
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

function computePredChangeIndicator(
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

interface SequenceSectionOptions {
  hasPrevious: boolean
  previousSequence: number[] | undefined
  previousHighlightSeqPosition: number
  previousPredecessorValue: number | undefined
  highlightSeqPosition: number
  predecessorValue: number | undefined
  highlightClass: string
  secondaryHighlightClass: string
  seqChangeIndicator: string
  input: number[]
  sequence: number[]
  onEnter: () => void
  onLeave: () => void
}

function renderSequenceSection(options: SequenceSectionOptions) {
  const {
    hasPrevious,
    previousSequence,
    previousHighlightSeqPosition,
    previousPredecessorValue,
    highlightSeqPosition,
    predecessorValue,
    highlightClass,
    secondaryHighlightClass,
    seqChangeIndicator,
    input,
    sequence,
    onEnter,
    onLeave,
  } = options

  return (
    <div class={styles.stateCompareSection} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <div class={styles.sectionTitle}>
        Sequence State:
        <span class={styles.sectionHint}>（存储的是 index，→ 后显示对应 value）</span>
      </div>
      <div class={styles.stateCompareGrid}>
        {hasPrevious && previousSequence && (
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
                  return input[idx]
                }),
                highlightPos: previousHighlightSeqPosition,
                highlightClass: styles.highlightPrevious,
              })}
            </code>
            <span class={styles.changeIndicator}></span>
          </div>
        )}
        <div class={styles.stateRow}>
          <span class={styles.stateRowLabel}>{hasPrevious ? '当前:' : ''}</span>
          <code class={styles.stateCode}>
            {renderHighlightedArray({
              array: sequence,
              highlightPos: highlightSeqPosition,
              highlightClass,
              secondaryHighlightValue: predecessorValue,
              secondaryHighlightClass,
            })}
          </code>
          <code class={styles.stateCode}>
            → values:{' '}
            {renderHighlightedArray({
              array: sequence.map((idx) => {
                return input[idx]
              }),
              highlightPos: highlightSeqPosition,
              highlightClass,
            })}
          </code>
          <span class={styles.changeIndicator}>{seqChangeIndicator}</span>
        </div>
      </div>
    </div>
  )
}

interface PredecessorSectionOptions {
  hasPrevious: boolean
  previousPredecessors: number[] | undefined
  highlightPredIndex: number
  highlightClass: string
  predChangeIndicator: string
  hoveredPositions: number[] | undefined
  onEnter: () => void
  onLeave: () => void
  predecessors: number[]
}

function renderPredecessorSection(options: PredecessorSectionOptions) {
  const {
    hasPrevious,
    previousPredecessors,
    highlightPredIndex,
    highlightClass,
    predChangeIndicator,
    hoveredPositions,
    onEnter,
    onLeave,
    predecessors,
  } = options

  return (
    <div class={styles.stateCompareSection} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <div class={styles.sectionTitle}>
        Predecessors:
        <span class={styles.sectionHint}>（每个位置存储前驱元素的 index，-1 表示无前驱）</span>
      </div>
      <div class={styles.stateCompareGrid}>
        {hasPrevious && previousPredecessors && (
          <div class={`${styles.stateRow} ${styles.previousRow}`}>
            <span class={styles.stateRowLabel}>上一步:</span>
            <code class={styles.stateCode}>
              {renderHighlightedArray({
                array: previousPredecessors,
                highlightPos: highlightPredIndex,
                highlightClass: styles.highlightPrevious,
              })}
            </code>
            <span></span>
            <span class={styles.changeIndicator}></span>
          </div>
        )}
        <div class={styles.stateRow}>
          <span class={styles.stateRowLabel}>{hasPrevious ? '当前:' : ''}</span>
          <code class={styles.stateCode}>
            {renderHighlightedArray({
              array: predecessors,
              highlightPos: highlightPredIndex,
              highlightClass,
              hoveredPositions,
            })}
          </code>
          <span></span>
          <span class={styles.changeIndicator}>{predChangeIndicator}</span>
        </div>
      </div>
    </div>
  )
}

interface ChainViewOptions {
  chains: number[][]
  changedNodesByChain: Map<number, Set<number>>
  highlightPredIndex: number
  isChainAction: boolean
  highlightClass: string
  isSequenceHovered: boolean
  isPredecessorsHovered: boolean | undefined
  onChainEnter: (chain: number[], chainIndex: number) => () => void
  onChainLeave: () => void
  input: number[]
  predecessors: number[]
  actionType: StepAction['type'] | undefined
}

function renderChainView(options: ChainViewOptions) {
  const {
    chains,
    changedNodesByChain,
    highlightPredIndex,
    isChainAction,
    highlightClass,
    isSequenceHovered,
    isPredecessorsHovered,
    onChainEnter,
    onChainLeave,
    input,
    predecessors,
    actionType,
  } = options

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
              onMouseEnter={onChainEnter(chain, chainIndex)}
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
                  const nodeClass = getNodeClassName({
                    isChainTailHighlight,
                    isHighlightNode,
                    isChangedNode,
                    actionType,
                    highlightClass,
                  })

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
    const previousChains =
      props.previousSequence && props.previousPredecessors
        ? buildAllChains(props.previousSequence, props.previousPredecessors)
        : undefined
    const { action, previousSequence, previousPredecessors } = props
    const highlightClass = getHighlightClass(action)
    const secondaryHighlightClass = getSecondaryHighlightClass(action)
    const hasPrevious = previousSequence !== undefined
    const isChainAction = action?.type === 'append' || action?.type === 'replace'

    const { highlightSeqPosition, highlightPredIndex, previousHighlightSeqPosition } =
      computeHighlightState(action, props.sequence)

    const changedNodesByChain = computeChangedNodesByChain(
      chains,
      previousChains,
      isChainAction,
      highlightPredIndex,
    )

    const seqChangeIndicator = getSeqChangeIndicator(action, hasPrevious)

    const { predecessorValue, previousPredecessorValue } = computePredecessorHighlight(
      highlightPredIndex,
      props.predecessors,
      action,
    )

    const predChangeIndicator = computePredChangeIndicator(
      hasPrevious,
      previousPredecessors,
      highlightPredIndex,
      props.predecessors,
    )

    return (
      <div class={styles.sequenceGraph}>
        {renderSequenceSection({
          hasPrevious,
          previousSequence,
          previousHighlightSeqPosition,
          previousPredecessorValue,
          highlightSeqPosition,
          predecessorValue,
          highlightClass,
          secondaryHighlightClass,
          seqChangeIndicator,
          input: props.input,
          sequence: props.sequence,
          onEnter: handleSequenceMouseEnter,
          onLeave: handleSequenceMouseLeave,
        })}

        {renderPredecessorSection({
          hasPrevious,
          previousPredecessors,
          highlightPredIndex,
          highlightClass,
          predChangeIndicator,
          hoveredPositions: props.hoveredIndexes,
          onEnter: handlePredecessorsMouseEnter,
          onLeave: handlePredecessorsMouseLeave,
          predecessors: props.predecessors,
        })}

        {renderChainView({
          chains,
          changedNodesByChain,
          highlightPredIndex,
          isChainAction,
          highlightClass,
          isSequenceHovered: Boolean(props.isSequenceHovered),
          isPredecessorsHovered: props.isPredecessorsHovered,
          onChainEnter: handleChainMouseEnter,
          onChainLeave: handleChainMouseLeave,
          input: props.input,
          predecessors: props.predecessors,
          actionType: action?.type,
        })}
      </div>
    )
  }
}
