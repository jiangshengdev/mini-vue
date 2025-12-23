/**
 * LIS 算法可视化 - 输入编辑器组件
 *
 * 允许用户编辑输入数组，输入变化时重新计算追踪
 */

import styles from '../styles/visualization.module.css'
import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export interface InputEditorProps {
  /** 当前输入数组 */
  input: number[]
  /** 输入变化时的回调 */
  onInputChange: (input: number[]) => void
}

/** 解析输入字符串为数字数组 */
function parseInput(
  value: string,
): { success: true; data: number[] } | { success: false; error: string } {
  const trimmed = value.trim()

  if (!trimmed) {
    return { success: true, data: [] }
  }

  // 支持逗号或空格分隔
  const parts = trimmed.split(/[,\s]+/).filter(Boolean)
  const numbers: number[] = []

  for (const part of parts) {
    const number_ = Number(part)

    if (Number.isNaN(number_)) {
      return { success: false, error: `无效的数字: "${part}"` }
    }

    numbers.push(number_)
  }

  return { success: true, data: numbers }
}

export const InputEditor: SetupComponent<InputEditorProps> = (props) => {
  const inputText = state(props.input.join(', '))
  const error = state<string | undefined>(undefined)

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    const { value } = target

    inputText.set(value)

    const result = parseInput(value)

    if (result.success) {
      error.set(undefined)
      props.onInputChange(result.data)
    } else {
      error.set(result.error)
    }
  }

  return () => {
    const currentError = error.get()

    return (
      <div class={styles.inputEditor}>
        <label class={styles.inputLabel}>
          输入数组（逗号或空格分隔，-1 表示跳过）:
          <input
            type="text"
            class={`${styles.inputField} ${currentError ? styles.inputError : ''}`}
            value={inputText.get()}
            onInput={handleInput}
            placeholder="例如: 2, 1, 3, 0, 4"
          />
        </label>
        {currentError && <div class={styles.errorMessage}>{currentError}</div>}
      </div>
    )
  }
}
