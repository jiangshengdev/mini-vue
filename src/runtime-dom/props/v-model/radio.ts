/**
 * `<input type="radio">` 的 `v-model` 受控化实现。
 *
 * 依据控件 `value` 与绑定值比对，决定选中态并同步回写。
 * 不处理同组互斥外的逻辑，聚焦单个 radio 控件。
 */
import { readModelValue, setModelValue } from './model.ts'
import type { TrackConflict } from './types.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 为 radio 应用 `v-model` 绑定。
 *
 * @param modelBinding - 传入的 v-model 绑定目标
 * @param props - 待写入的 props 对象
 * @param trackConflict - 冲突追踪回调
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

  /* 选中即回写自身值，交由同组 radio 互斥控制。 */
  props.onChange = (_event: Event) => {
    setModelValue(modelBinding, controlValue)
  }
}
