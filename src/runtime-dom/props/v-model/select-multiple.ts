/**
 * `<select multiple>` 多选模式的 `v-model` 转换实现。
 */
import { readModelValue, setModelValue } from './model.ts'
import type { TrackConflict } from './types.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 为多选 select 应用 `v-model` 绑定。
 */
export function applySelectMultipleModelBinding(
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
    const selectedValues = [...select.selectedOptions].map((option) => {
      return option.value
    })

    setModelValue(modelBinding, selectedValues)
  }
}
