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

/** 默认示例数组 */
const defaultInput = [2, 1, 3, 0, 4]

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

/** 生成随机数字序列 */
function generateRandomSequence(): number[] {
  // 随机长度 5-10
  const length = Math.floor(Math.random() * 6) + 5
  const result: number[] = []

  for (let i = 0; i < length; i++) {
    // 随机决定是否生成 -1（约 10% 概率）
    if (Math.random() < 0.1) {
      result.push(-1)
    } else {
      // 生成 0-20 的随机数
      result.push(Math.floor(Math.random() * 21))
    }
  }

  return result
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

  const handleClear = () => {
    inputText.set('')
    error.set(undefined)
    props.onInputChange([])
  }

  const handleReset = () => {
    const text = defaultInput.join(', ')

    inputText.set(text)
    error.set(undefined)
    props.onInputChange(defaultInput)
  }

  const handleRandom = () => {
    const randomSequence = generateRandomSequence()
    const text = randomSequence.join(', ')

    inputText.set(text)
    error.set(undefined)
    props.onInputChange(randomSequence)
  }

  return () => {
    const currentError = error.get()

    return (
      <div class={styles.inputEditor}>
        <label class={styles.inputLabel}>
          输入数组（逗号或空格分隔，-1 表示跳过）
          <div class={styles.inputRow}>
            <input
              type="text"
              class={`${styles.inputField} ${currentError ? styles.inputError : ''}`}
              value={inputText.get()}
              onInput={handleInput}
              placeholder="例如：2, 1, 3, 0, 4"
            />
            <div class={styles.inputActions}>
              <button
                type="button"
                class={styles.inputActionButton}
                onClick={handleClear}
                title="清空输入"
              >
                <span class={styles.iconClear} />
              </button>
              <button
                type="button"
                class={styles.inputActionButton}
                onClick={handleReset}
                title="重置为默认示例"
              >
                <span class={styles.iconReplay} />
              </button>
              <button
                type="button"
                class={styles.inputActionButton}
                onClick={handleRandom}
                title="生成随机序列"
              >
                <span class={styles.iconShuffle} />
              </button>
            </div>
          </div>
        </label>
        {currentError && <div class={styles.errorMessage}>{currentError}</div>}
      </div>
    )
  }
}
