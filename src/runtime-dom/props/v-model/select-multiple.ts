/**
 * `<select multiple>` 多选模式的 `v-model` 受控化实现。
 *
 * 使用数组同步选中项，保持 `value` 与 `selectedOptions` 一致。
 * 不负责去重与校验，交由调用方保证候选项唯一性。
 */
import { readModelValue, setModelValue } from './model.ts'
import type { TrackConflict } from './types.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 为多选 select 应用 `v-model` 绑定。
 *
 * @param modelBinding - 传入的 v-model 绑定目标
 * @param props - 待写入的 props 对象
 * @param trackConflict - 冲突追踪回调
 */
export function applySelectMultipleModelBinding(
  modelBinding: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
): void {
  trackConflict('value')
  props.value = readModelValue(modelBinding)

  trackConflict('onChange')

  /* 将所有选中项收集为数组写回，保持多选受控。 */
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
