import { readModelValue, setModelValue } from './model.ts'
import type { PropsShape } from '@/shared/index.ts'

type TrackConflict = (key: string) => void

export function applyCheckboxModelBinding(
  modelBinding: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
): void {
  const controlValue = Object.hasOwn(props, 'value') ? props.value : 'on'
  const modelValue = readModelValue(modelBinding)

  if (Array.isArray(modelValue)) {
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

      if (!Array.isArray(current)) {
        setModelValue(modelBinding, input.checked ? [controlValue] : [])

        return
      }

      if (input.checked) {
        if (current.includes(controlValue)) {
          return
        }

        const currentArray = current as unknown[]
        const updated = [...currentArray, controlValue] as unknown[]

        setModelValue(modelBinding, updated)
      } else {
        setModelValue(
          modelBinding,
          current.filter((item) => {
            return item !== controlValue
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

    setModelValue(modelBinding, input.checked)
  }
}
