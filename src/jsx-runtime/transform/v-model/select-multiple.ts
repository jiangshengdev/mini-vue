import { readModelValue, setModelValue } from './model.ts'
import type { PropsShape } from '@/shared/index.ts'

type TrackConflict = (key: string) => void

export function applySelectMultipleModelBinding(
  modelBinding: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
): void {
  const modelValue = readModelValue(modelBinding)

  trackConflict('value')
  props.value = modelValue

  trackConflict('onChange')

  props.onChange = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    const select = target as HTMLSelectElement

    const selectedValues = [...select.selectedOptions].map((option) => {
      return option.value
    })

    setModelValue(modelBinding, selectedValues)
  }
}
