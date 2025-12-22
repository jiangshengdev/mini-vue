import { runtimeDomUnsupportedAttrValue } from '@/messages/index.ts'
import { __DEV__, isNil } from '@/shared/index.ts'

/** 处理受控表单的 `value`/`checked`。 */
export function handleFormStateProp(
  element: Element,
  key: string,
  previous: unknown,
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
 * 为多选 `select` 应用数组值，按严格等于匹配选中项。
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
        console.warn(runtimeDomUnsupportedAttrValue('value', typeof next), next)
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
