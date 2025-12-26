/**
 * 表单受控属性处理模块。
 *
 * 本模块负责将 `value`/`checked` 等表单状态属性写入 DOM property，
 * 而非 attribute，以确保受控组件的 UI 与状态同步。
 *
 * 支持的元素与属性：
 * - `<input>` 的 `value` 和 `checked`
 * - `<textarea>` 的 `value`
 * - `<select>` 的 `value`（支持单选和多选）
 */
import { runtimeDomUnsupportedAttrValue } from '@/messages/index.ts'
import { __DEV__, isNil } from '@/shared/index.ts'

/**
 * 处理受控表单的 `value`/`checked` 属性。
 *
 * @param element - 目标 DOM 元素
 * @param key - 属性名，仅处理 `value` 或 `checked`
 * @param _previous - 上一次的属性值（未使用，保留参数位置）
 * @param next - 本次的属性值
 * @returns 是否已处理该属性（`true` 表示已处理，调用方应跳过后续逻辑）
 */
export function handleFormStateProp(
  element: Element,
  key: string,
  _previous: unknown,
  next: unknown,
): boolean {
  /* 受控表单：`value`/`checked` 应写 DOM property，确保 UI 同步。 */
  if (key === 'value' && element instanceof HTMLInputElement) {
    element.value = isNil(next) ? '' : (next as string)

    return true
  }

  if (key === 'value' && element instanceof HTMLTextAreaElement) {
    element.value = isNil(next) ? '' : (next as string)

    return true
  }

  if (key === 'value' && element instanceof HTMLSelectElement) {
    applySelectValue(element, next)

    return true
  }

  if (key === 'checked' && element instanceof HTMLInputElement) {
    element.checked = Boolean(next)

    return true
  }

  return false
}

/**
 * 为 `<select>` 元素应用 value 属性。
 *
 * 策略：
 * - 单选模式：直接设置 `element.value`
 * - 多选模式：遍历 options 按值匹配设置 `selected`
 * - 数组值 + 单选：取首个元素
 * - 使用 `queueMicrotask` 延迟执行，等待 DOM option 生成完毕
 *
 * @param element - 目标 select 元素
 * @param value - 要设置的值，支持单值或数组
 */
function applySelectValue(element: HTMLSelectElement, value: unknown): void {
  const applySingleValue = (next: unknown) => {
    let normalized = ''

    if (isNil(next)) {
      normalized = ''
    } else if (typeof next === 'string' || typeof next === 'number') {
      normalized = String(next)
    } else {
      if (__DEV__) {
        console.warn(runtimeDomUnsupportedAttrValue('value', typeof next), {
          element,
          value: next,
        })
      }

      normalized = ''
    }

    element.value = normalized

    if (element.multiple) {
      const options = [...element.options]

      for (const option of options) {
        option.selected = normalized !== '' && option.value === normalized
      }
    }
  }

  if (!Array.isArray(value)) {
    queueMicrotask(() => {
      applySingleValue(value)
    })

    return
  }

  const values = value as unknown[]

  /* 非 `multiple` 组件仅取首个值，保持「数组 + 单选」场景可用。 */
  if (!element.multiple) {
    const first = values[0]

    queueMicrotask(() => {
      applySingleValue(first)
    })

    return
  }

  const normalizedValues = new Set(values)

  /* 多选场景在微任务中同步选中态，等待 DOM option 生成完毕。 */
  queueMicrotask(() => {
    const options = [...element.options]

    for (const option of options) {
      option.selected = normalizedValues.has(option.value)
    }
  })
}
