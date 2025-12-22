import { readModelValue, setModelValue } from './model.ts'
import type { PropsShape } from '@/shared/index.ts'

type TrackConflict = (key: string) => void

export function applyTextlikeModelBinding(
  model: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
  eventName: 'onInput' | 'onChange',
): void {
  trackConflict('value')
  props.value = readModelValue(model)

  trackConflict(eventName)

  props[eventName] = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    const input = target as HTMLInputElement | HTMLTextAreaElement

    setModelValue(model, input.value)
  }
}
