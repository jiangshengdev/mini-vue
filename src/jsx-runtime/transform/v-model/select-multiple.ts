/**
 * `<select multiple>` 多选模式的 `v-model` 转换实现。
 *
 * 多选 select 的绑定逻辑：
 * - `value` 属性反映绑定值（应为数组）
 * - 选择变更时将绑定值设置为所有选中 option 的 value 数组
 */
import { readModelValue, setModelValue } from './model.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 冲突追踪回调类型。
 */
type TrackConflict = (key: string) => void

/**
 * 为多选 select 应用 `v-model` 绑定。
 *
 * 转换规则：
 * - 注入 `value` 属性（直接使用绑定值，应为数组）
 * - 注入 `onChange` 事件处理器（更新绑定值为所有选中项的 value 数组）
 *
 * @param modelBinding - `v-model` 绑定的目标（Ref 或普通值，值应为数组）
 * @param props - 将被修改的 props 对象
 * @param trackConflict - 冲突追踪回调
 */
export function applySelectMultipleModelBinding(
  modelBinding: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
): void {
  const modelValue = readModelValue(modelBinding)

  trackConflict('value')
  props.value = modelValue

  trackConflict('onChange')

  props.onChange = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    const select = target as HTMLSelectElement

    /* 从 selectedOptions 中提取所有选中项的 value。 */
    const selectedValues = [...select.selectedOptions].map((option) => {
      return option.value
    })

    setModelValue(modelBinding, selectedValues)
  }
}
