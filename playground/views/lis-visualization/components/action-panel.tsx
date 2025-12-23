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
}

/** 根据操作类型生成描述文本 */
function getActionDescription(action: StepAction, currentValue: number): string {
  switch (action.type) {
    case 'append': {
      return `APPEND index ${action.index} (value ${currentValue}) to sequence`
    }

    case 'replace': {
      return `REPLACE sequence[${action.position}] with index ${action.index} (value ${currentValue})`
    }

    case 'skip': {
      return `SKIP index ${action.index} (value is -1)`
    }
  }
}

/** 根据操作类型获取样式类名 */
function getActionClass(action: StepAction): string {
  switch (action.type) {
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

export const ActionPanel: SetupComponent<ActionPanelProps> = (props) => {
  return () => {
    if (!props.action || props.currentValue === undefined) {
      return (
        <div class={styles.actionPanel}>
          <h3 class={styles.sectionTitle}>Action</h3>
          <div class={styles.actionContent}>（等待开始）</div>
        </div>
      )
    }

    const description = getActionDescription(props.action, props.currentValue)
    const actionClass = getActionClass(props.action)

    return (
      <div class={styles.actionPanel}>
        <h3 class={styles.sectionTitle}>Action</h3>
        <div class={`${styles.actionContent} ${actionClass}`}>
          <span class={styles.actionType}>{props.action.type.toUpperCase()}</span>
          <span class={styles.actionDescription}>{description}</span>
        </div>
      </div>
    )
  }
}
