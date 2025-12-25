/**
 * `<input type="checkbox">` 的 `v-model` 转换实现。
 *
 * checkbox 支持两种绑定模式：
 * 1. 布尔值绑定：`checked` 直接反映绑定值的布尔状态
 * 2. 数组绑定：`checked` 表示当前 `value` 是否在数组中
 *
 * 数组绑定模式下，勾选/取消勾选会向数组添加/移除当前 checkbox 的 `value`。
 */
import { readModelValue, setModelValue } from './model.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 冲突追踪回调类型。
 */
type TrackConflict = (key: string) => void

/**
 * 为 checkbox 应用 `v-model` 绑定。
 *
 * 转换规则：
 * - 注入 `checked` 属性（根据绑定值计算）
 * - 注入 `onChange` 事件处理器（更新绑定值）
 *
 * 绑定值类型决定行为：
 * - 数组：`checked = array.includes(value)`，变更时添加/移除元素
 * - 其他：`checked = Boolean(value)`，变更时设置为 `true`/`false`
 *
 * @param modelBinding - `v-model` 绑定的目标（Ref 或普通值）
 * @param props - 将被修改的 props 对象
 * @param trackConflict - 冲突追踪回调
 */
export function applyCheckboxModelBinding(
  modelBinding: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
): void {
  /* 获取 checkbox 的 value，默认为 'on'（HTML 规范默认值）。 */
  const controlValue = Object.hasOwn(props, 'value') ? props.value : 'on'
  const modelValue = readModelValue(modelBinding)

  /* 数组绑定模式：checked 表示当前 value 是否在数组中。 */
  if (Array.isArray(modelValue)) {
    const isChecked = modelValue.includes(controlValue)

    trackConflict('checked')
    props.checked = isChecked

    trackConflict('onChange')

    props.onChange = (event: Event) => {
      const { target } = event

      if (!target) {
        return
      }

      const input = target as HTMLInputElement
      const current = readModelValue(modelBinding)

      /* 如果绑定值在事件触发时已不是数组，则重新初始化为数组。 */
      if (!Array.isArray(current)) {
        setModelValue(modelBinding, input.checked ? [controlValue] : [])

        return
      }

      if (input.checked) {
        /* 勾选时：如果 value 不在数组中，则添加。 */
        if (current.includes(controlValue)) {
          return
        }

        const currentArray = current as unknown[]
        const updated = [...currentArray, controlValue] as unknown[]

        setModelValue(modelBinding, updated)
      } else {
        /* 取消勾选时：从数组中移除 value。 */
        setModelValue(
          modelBinding,
          current.filter((item) => {
            return item !== controlValue
          }),
        )
      }
    }

    return
  }

  /* 布尔值绑定模式：checked 直接反映绑定值的布尔状态。 */
  trackConflict('checked')
  props.checked = Boolean(modelValue)

  trackConflict('onChange')

  props.onChange = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    const input = target as HTMLInputElement

    setModelValue(modelBinding, input.checked)
  }
}
