import { readModelValue, setModelValue } from './model.ts'
import type { PropsShape } from '@/shared/index.ts'

type TrackConflict = (key: string) => void

export function applySelectSingleModelBinding(
  modelBinding: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
): void {
  trackConflict('value')
  props.value = readModelValue(modelBinding)

  trackConflict('onChange')

  props.onChange = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    const select = target as HTMLSelectElement

    setModelValue(modelBinding, select.value)
  }
}
