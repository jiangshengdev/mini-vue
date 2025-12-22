import { readModelValue, setModelValue } from './model.ts'
import type { PropsShape } from '@/shared/index.ts'

type TrackConflict = (key: string) => void

export function applyRadioVModel(
  model: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
): void {
  const boundValue = Object.hasOwn(props, 'value') ? props.value : 'on'
  const modelValue = readModelValue(model)

  trackConflict('checked')
  props.checked = modelValue === boundValue

  trackConflict('onChange')

  props.onChange = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    setModelValue(model, boundValue)
  }
}
