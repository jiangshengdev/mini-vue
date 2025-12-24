/**
 * LIS 算法可视化 - 操作面板组件
 *
 * 显示当前操作类型和详情
 */

import type { StepAction } from '../types'
import styles from '../styles/visualization.module.css'
import type { SetupComponent } from '@/index.ts'

export interface ActionPanelProps {
  /** 当前操作 */
  action: StepAction | undefined
  /** 当前处理的值 */
  currentValue: number | undefined
  /** 当前 sequence 状态 */
  sequence: number[]
  /** 当前 predecessors 状态 */
  predecessors: number[]
}

/** 根据操作类型生成描述文本 */
function getActionDescription(action: StepAction, currentValue: number): string {
  switch (action.type) {
    case 'init': {
      return '算法初始化，sequence 为空，predecessors 全为 -1'
    }

    case 'append': {
      return `追加索引 ${action.index}（值 ${currentValue}）到 sequence`
    }

    case 'replace': {
      return `替换 sequence[${action.position}] 为索引 ${action.index}（值 ${currentValue}）`
    }

    case 'skip': {
      /* 区分跳过原因：-1 表示占位符，其他值表示重复 */
      if (currentValue === -1) {
        return `跳过索引 ${action.index}（值为 -1，占位符）`
      }

      return `跳过索引 ${action.index}（值 ${currentValue}，重复值无需替换）`
    }
  }
}

/** 根据操作类型获取样式类名 */
function getActionClass(action: StepAction): string {
  switch (action.type) {
    case 'init': {
      return styles.actionInit
    }

    case 'append': {
      return styles.actionAppend
    }

    case 'replace': {
      return styles.actionReplace
    }

    case 'skip': {
      return styles.actionSkip
    }
  }
}

/** 生成变更明细 */
function getChangeDetails(
  action: StepAction,
  sequence: number[],
  predecessors: number[],
): { sequenceChange: string; predecessorsChange: string } {
  switch (action.type) {
    case 'init': {
      return {
        sequenceChange: 'sequence = []',
        predecessorsChange: `predecessors = [${predecessors.join(', ')}]`,
      }
    }

    case 'append': {
      const pos = sequence.length - 1

      return {
        sequenceChange: `sequence[${pos}] = ${action.index}`,
        predecessorsChange: `predecessors[${action.index}] = ${predecessors[action.index]}`,
      }
    }

    case 'replace': {
      return {
        sequenceChange: `sequence[${action.position}] = ${action.index}`,
        predecessorsChange: `predecessors[${action.index}] = ${predecessors[action.index]}`,
      }
    }

    case 'skip': {
      return {
        sequenceChange: '（无变更）',
        predecessorsChange: '（无变更）',
      }
    }
  }
}

export const ActionPanel: SetupComponent<ActionPanelProps> = (props) => {
  return () => {
    if (!props.action) {
      return (
        <div class={styles.actionPanel}>
          <h3 class={styles.sectionTitle}>操作</h3>
          <div class={styles.actionContent}>（等待开始）</div>
        </div>
      )
    }

    const description = getActionDescription(props.action, props.currentValue ?? -1)
    const actionClass = getActionClass(props.action)
    const { sequenceChange, predecessorsChange } = getChangeDetails(
      props.action,
      props.sequence,
      props.predecessors,
    )

    const actionTypeMap: Record<string, string> = {
      init: '初始化',
      append: '追加',
      replace: '替换',
      skip: '跳过',
    }

    return (
      <div class={styles.actionPanel}>
        <h3 class={styles.sectionTitle}>操作</h3>
        <div class={`${styles.actionContent} ${actionClass}`}>
          <span class={styles.actionType}>{actionTypeMap[props.action.type]}</span>
          <span class={styles.actionDescription}>{description}</span>
        </div>
        <div class={styles.actionDetails}>
          <code class={styles.actionDetailCode}>{sequenceChange}</code>
          <code class={styles.actionDetailCode}>{predecessorsChange}</code>
        </div>
      </div>
    )
  }
}
