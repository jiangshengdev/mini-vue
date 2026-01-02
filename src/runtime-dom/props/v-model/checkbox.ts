/**
 * `<input type="checkbox">` 的 `v-model` 转换实现。
 */
import { readModelValue, setModelValue } from './model.ts'
import type { TrackConflict } from './types.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 判断输入是否为未知元素数组。
 *
 * @param value - 待判定的值
 * @returns 是否为数组
 */
function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * 为 checkbox 应用 `v-model` 绑定。
 *
 * @param modelBinding - 传入的 v-model 绑定目标
 * @param props - 待写入的 props 对象
 * @param trackConflict - 冲突追踪回调
 */
export function applyCheckboxModelBinding(
  modelBinding: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
): void {
  const controlValue = Object.hasOwn(props, 'value') ? props.value : 'on'
  const modelValue = readModelValue(modelBinding)

  if (isUnknownArray(modelValue)) {
    const isChecked = modelValue.includes(controlValue)

    trackConflict('checked')
    props.checked = isChecked

    trackConflict('onChange')

    props.onChange = (event: Event) => {
      const { target } = event

      if (!target) {
        return
      }

      const input = target as HTMLInputElement
      const current = readModelValue(modelBinding)

      if (!isUnknownArray(current)) {
        setModelValue(modelBinding, input.checked ? [controlValue] : [])

        return
      }

      if (input.checked) {
        if (current.includes(controlValue)) {
          return
        }

        setModelValue(modelBinding, [...current, controlValue])

        return
      }

      setModelValue(
        modelBinding,
        current.filter((item) => {
          return item !== controlValue
        }),
      )
    }

    return
  }

  trackConflict('checked')
  props.checked = Boolean(modelValue)

  trackConflict('onChange')

  props.onChange = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    const input = target as HTMLInputElement

    setModelValue(modelBinding, input.checked)
  }
}
