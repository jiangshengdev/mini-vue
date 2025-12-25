/**
 * `<select>` 单选模式的 `v-model` 转换实现。
 *
 * 单选 select 的绑定逻辑：
 * - `value` 属性直接反映绑定值
 * - 选择变更时将绑定值设置为选中 option 的 value
 */
import { readModelValue, setModelValue } from './model.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 冲突追踪回调类型。
 */
type TrackConflict = (key: string) => void

/**
 * 为单选 select 应用 `v-model` 绑定。
 *
 * 转换规则：
 * - 注入 `value` 属性（直接使用绑定值）
 * - 注入 `onChange` 事件处理器（更新绑定值为选中项的 value）
 *
 * @param modelBinding - `v-model` 绑定的目标（Ref 或普通值）
 * @param props - 将被修改的 props 对象
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

  props.onChange = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    const select = target as HTMLSelectElement

    setModelValue(modelBinding, select.value)
  }
}
