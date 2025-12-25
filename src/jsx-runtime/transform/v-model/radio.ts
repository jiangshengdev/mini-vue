/**
 * `<input type="radio">` 的 `v-model` 转换实现。
 *
 * radio 的绑定逻辑：
 * - `checked` = 绑定值 === 当前 radio 的 `value`
 * - 选中时将绑定值设置为当前 radio 的 `value`
 *
 * 同一组 radio（相同 `name`）共享同一个绑定值，选中任一 radio 会更新绑定值。
 */
import { readModelValue, setModelValue } from './model.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 冲突追踪回调类型。
 */
type TrackConflict = (key: string) => void

/**
 * 为 radio 应用 `v-model` 绑定。
 *
 * 转换规则：
 * - 注入 `checked` 属性（绑定值 === value 时为 true）
 * - 注入 `onChange` 事件处理器（选中时更新绑定值为当前 value）
 *
 * @param modelBinding - `v-model` 绑定的目标（Ref 或普通值）
 * @param props - 将被修改的 props 对象
 * @param trackConflict - 冲突追踪回调
 */
export function applyRadioModelBinding(
  modelBinding: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
): void {
  /* 获取 radio 的 value，默认为 'on'（HTML 规范默认值）。 */
  const controlValue = Object.hasOwn(props, 'value') ? props.value : 'on'
  const modelValue = readModelValue(modelBinding)

  /* 使用严格等于判断当前 radio 是否被选中。 */
  trackConflict('checked')
  props.checked = modelValue === controlValue

  trackConflict('onChange')

  props.onChange = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    /* 选中时将绑定值设置为当前 radio 的 value。 */
    setModelValue(modelBinding, controlValue)
  }
}
