/**
 * LIS 算法可视化 - 输入编辑器组件
 *
 * @remarks
 * 允许用户编辑输入数组，输入变化时重新计算追踪。
 * - 支持逗号或空格分隔的数字输入
 * - 提供清空、重置、随机生成等快捷操作
 * - 实时校验输入格式并显示错误提示
 */

import sharedStyles from '../styles/shared.module.css'
import stepControlsStyles from '../styles/step-controls.module.css'
import inputEditorStyles from '../styles/input-editor.module.css'
import { generateRandomSequence, parseInput } from '../utils/input-utils.ts'
import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

/** 合并多个样式模块 */
const styles = { ...sharedStyles, ...stepControlsStyles, ...inputEditorStyles }

/**
 * 输入编辑器组件的 Props 定义
 */
export interface InputEditorProps {
  /** 当前输入数组 */
  input: number[]
  /** 输入变化时的回调 */
  onInputChange: (input: number[]) => void
}

/** 默认示例数组，用于重置操作 */
const defaultInput = [2, 1, 3, 0, 4]

/**
 * 输入编辑器组件，提供数组输入和快捷操作
 *
 * @remarks
 * - 使用 `state` 管理输入文本和错误状态
 * - 输入变化时实时解析并校验
 * - 提供清空、重置、随机生成三种快捷操作
 */
export const InputEditor: SetupComponent<InputEditorProps> = (props) => {
  /** 输入框文本状态 */
  const inputText = state(props.input.join(', '))
  /** 错误信息状态 */
  const error = state<string | undefined>(undefined)

  /**
   * 处理输入变化事件
   *
   * @remarks
   * 解析输入文本，成功则通知父组件，失败则显示错误
   */
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

  /** 清空输入 */
  const handleClear = () => {
    inputText.set('')
    error.set(undefined)
    props.onInputChange([])
  }

  /** 重置为默认示例 */
  const handleReset = () => {
    const text = defaultInput.join(', ')

    inputText.set(text)
    error.set(undefined)
    props.onInputChange(defaultInput)
  }

  /** 生成随机序列 */
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
      <div class={styles.inputEditor} data-testid="lis-input-editor">
        <label class={styles.inputLabel}>
          输入数组（逗号或空格分隔，-1 表示新节点，重复值自动转为 -1）
          <div class={styles.inputRow}>
            <input
              data-testid="lis-input"
              type="text"
              class={`${styles.inputField} ${currentError ? styles.inputError : ''}`}
              value={inputText.get()}
              onInput={handleInput}
              placeholder="例如：2, 1, 3, 0, 4"
            />
            <div class={styles.inputActions}>
              <button
                data-testid="lis-input-clear"
                type="button"
                class={styles.inputActionButton}
                onClick={handleClear}
                title="清空输入"
              >
                <span class={styles.iconClear} />
              </button>
              <button
                data-testid="lis-input-reset"
                type="button"
                class={styles.inputActionButton}
                onClick={handleReset}
                title="重置为默认示例"
              >
                <span class={styles.iconReplay} />
              </button>
              <button
                data-testid="lis-input-random"
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
        {currentError && (
          <div class={styles.errorMessage} data-testid="lis-input-error">
            {currentError}
          </div>
        )}
      </div>
    )
  }
}
