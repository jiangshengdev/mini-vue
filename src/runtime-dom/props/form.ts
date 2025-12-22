import { runtimeDomUnsupportedAttrValue } from '@/messages/index.ts'
import { __DEV__, isNil } from '@/shared/index.ts'

/** 处理受控表单的 `value`/`checked`。 */
export function handleFormStateProp(
  element: Element,
  key: string,
  previous: unknown,
  next: unknown,
): boolean {
  /* 多选 `select` 允许数组值，直接写 DOM property 控制选中项。 */
  if (key === 'value' && element instanceof HTMLSelectElement && Array.isArray(next ?? previous)) {
    applySelectValue(element, next)

    return true
  }

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
    element.value = isNil(next) ? '' : (next as string)

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
  if (!Array.isArray(value)) {
    if (isNil(value)) {
      element.value = ''
    } else if (typeof value === 'string' || typeof value === 'number') {
      element.value = String(value)
    } else {
      if (__DEV__) {
        console.warn(runtimeDomUnsupportedAttrValue('value', typeof value), value)
      }

      element.value = ''
    }

    return
  }

  const values = value as unknown[]

  if (!element.multiple) {
    const first = values[0]

    if (isNil(first)) {
      element.value = ''
    } else if (typeof first === 'string' || typeof first === 'number') {
      element.value = String(first)
    } else {
      if (__DEV__) {
        console.warn(runtimeDomUnsupportedAttrValue('value', typeof first), first)
      }

      element.value = ''
    }

    return
  }

  const normalizedValues = new Set(values)

  queueMicrotask(() => {
    const options = [...element.options]

    for (const option of options) {
      option.selected = normalizedValues.has(option.value)
    }
  })
}
