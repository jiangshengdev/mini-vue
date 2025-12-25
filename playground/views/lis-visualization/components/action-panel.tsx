/**
 * LIS 算法可视化 - 操作面板组件
 *
 * @remarks
 * 显示当前步骤的操作类型、描述和变更明细。
 * - 操作类型：初始化、追加、替换、跳过
 * - 变更明细：展示 `sequence` 和 `predecessors` 的具体修改
 */

import type { StepAction } from '../types'
import sharedStyles from '../styles/shared.module.css'
import styles from '../styles/action-panel.module.css'
import type { SetupComponent } from '@/index.ts'

/** 合并共享样式与组件专属样式，共享样式优先级较低 */
const mergedStyles = { ...sharedStyles, ...styles }

/**
 * 操作面板组件的 Props 定义
 */
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

/**
 * 根据操作类型生成人类可读的描述文本
 *
 * @remarks
 * - `init`：算法初始化说明
 * - `append`：追加操作，显示索引和值
 * - `replace`：替换操作，显示位置、索引和值
 * - `skip`：跳过操作，区分占位符和重复值两种情况
 */
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

/**
 * 根据操作类型获取对应的 CSS 样式类名
 */
function getActionClass(action: StepAction): string {
  switch (action.type) {
    case 'init': {
      return mergedStyles.actionInit
    }

    case 'append': {
      return mergedStyles.actionAppend
    }

    case 'replace': {
      return mergedStyles.actionReplace
    }

    case 'skip': {
      return mergedStyles.actionSkip
    }
  }
}

/**
 * 生成 `sequence` 和 `predecessors` 的变更明细文本
 *
 * @remarks
 * - `init`：显示初始状态
 * - `append`/`replace`：显示具体的数组修改
 * - `skip`：显示无变更
 */
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

/**
 * 操作面板组件，展示当前步骤的操作信息
 *
 * @remarks
 * - 无操作时显示等待状态
 * - 有操作时显示操作类型、描述和变更明细
 */
export const ActionPanel: SetupComponent<ActionPanelProps> = (props) => {
  return () => {
    /* 无操作时显示等待状态 */
    if (!props.action) {
      return (
        <div class={mergedStyles.actionPanel}>
          <h3 class={mergedStyles.sectionTitle}>操作</h3>
          <div class={mergedStyles.actionContent}>（等待开始）</div>
        </div>
      )
    }

    /* 计算操作描述、样式和变更明细 */
    const description = getActionDescription(props.action, props.currentValue ?? -1)
    const actionClass = getActionClass(props.action)
    const { sequenceChange, predecessorsChange } = getChangeDetails(
      props.action,
      props.sequence,
      props.predecessors,
    )

    /** 操作类型中英文映射 */
    const actionTypeMap: Record<string, string> = {
      init: '初始化',
      append: '追加',
      replace: '替换',
      skip: '跳过',
    }

    return (
      <div class={mergedStyles.actionPanel}>
        <h3 class={mergedStyles.sectionTitle}>操作</h3>
        <div class={`${mergedStyles.actionContent} ${actionClass}`}>
          <span class={mergedStyles.actionType}>{actionTypeMap[props.action.type]}</span>
          <span class={mergedStyles.actionDescription}>{description}</span>
        </div>
        <div class={mergedStyles.actionDetails}>
          <code class={mergedStyles.actionDetailCode}>{sequenceChange}</code>
          <code class={mergedStyles.actionDetailCode}>{predecessorsChange}</code>
        </div>
      </div>
    )
  }
}
