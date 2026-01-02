/**
 * `<select>` 单选模式的 `v-model` 受控化实现。
 *
 * 将绑定值写入 `value`，并在选项变更时回写选中值。
 * 不处理多选或原生校验，只聚焦单一选项同步。
 */
import { readModelValue, setModelValue } from './model.ts'
import type { TrackConflict } from './types.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 为单选 select 应用 `v-model` 绑定。
 *
 * @param modelBinding - 传入的 v-model 绑定目标
 * @param props - 待写入的 props 对象
 * @param trackConflict - 冲突追踪回调
 */
export function applySelectSingleModelBinding(
  modelBinding: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
): void {
  trackConflict('value')
  props.value = readModelValue(modelBinding)

  trackConflict('onChange')

  /* 监听选项变更，将当前选中值写回绑定。 */
  props.onChange = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    const select = target as HTMLSelectElement

    setModelValue(modelBinding, select.value)
  }
}
