/**
 * `<input type="radio">` 的 `v-model` 转换实现。
 */
import { readModelValue, setModelValue } from './model.ts'
import type { TrackConflict } from './types.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 为 radio 应用 `v-model` 绑定。
 */
export function applyRadioModelBinding(
  modelBinding: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
): void {
  const controlValue = Object.hasOwn(props, 'value') ? props.value : 'on'
  const modelValue = readModelValue(modelBinding)

  trackConflict('checked')
  props.checked = modelValue === controlValue

  trackConflict('onChange')

  props.onChange = (_event: Event) => {
    setModelValue(modelBinding, controlValue)
  }
}
