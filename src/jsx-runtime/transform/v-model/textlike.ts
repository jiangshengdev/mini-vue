import { readModelValue, setModelValue } from './model.ts'
import type { PropsShape } from '@/shared/index.ts'

type TrackConflict = (key: string) => void

export function applyTextLikeModelBinding(
  modelBinding: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
  eventName: 'onInput' | 'onChange',
): void {
  trackConflict('value')
  props.value = readModelValue(modelBinding)

  trackConflict(eventName)

  props[eventName] = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    const input = target as HTMLInputElement | HTMLTextAreaElement

    setModelValue(modelBinding, input.value)
  }
}
