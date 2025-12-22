import { readModelValue, setModelValue } from './model.ts'
import type { PropsShape } from '@/shared/index.ts'

type TrackConflict = (key: string) => void

export function applyCheckboxVModel(
  model: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
): void {
  const boundValue = Object.hasOwn(props, 'value') ? props.value : 'on'
  const modelValue = readModelValue(model)

  if (Array.isArray(modelValue)) {
    const isChecked = modelValue.includes(boundValue)

    trackConflict('checked')
    props.checked = isChecked

    trackConflict('onChange')

    props.onChange = (event: Event) => {
      const { target } = event

      if (!target) {
        return
      }

      const input = target as HTMLInputElement
      const current = readModelValue(model)

      if (!Array.isArray(current)) {
        setModelValue(model, input.checked ? [boundValue] : [])

        return
      }

      if (input.checked) {
        if (current.includes(boundValue)) {
          return
        }

        setModelValue(model, [...current, boundValue])
      } else {
        setModelValue(
          model,
          current.filter((item) => {
            return item !== boundValue
          }),
        )
      }
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

    setModelValue(model, input.checked)
  }
}
