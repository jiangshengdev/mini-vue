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
      return `追加索引 ${action.index}（值 ${currentValue}）到 sequence`
    }

    case 'replace': {
      return `替换 sequence[${action.position}] 为索引 ${action.index}（值 ${currentValue}）`
    }

    case 'skip': {
      return `跳过索引 ${action.index}（值为 -1）`
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
          <h3 class={styles.sectionTitle}>操作</h3>
          <div class={styles.actionContent}>（等待开始）</div>
        </div>
      )
    }

    const description = getActionDescription(props.action, props.currentValue)
    const actionClass = getActionClass(props.action)

    const actionTypeMap: Record<string, string> = {
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
      </div>
    )
  }
}
