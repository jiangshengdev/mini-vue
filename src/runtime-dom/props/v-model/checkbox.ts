/**
 * `<input type="checkbox">` 的 `v-model` 受控化实现。
 *
 * 支持布尔绑定与数组绑定：布尔用于单个开关，数组用于多选集合。
 * 本模块仅负责值同步，不处理原生校验或三态 checkbox。
 */
import { readModelValue, setModelValue } from './model.ts'
import type { TrackConflict } from './types.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 判断绑定值是否为数组，用于区分集合模式。
 *
 * @param value - 待判定的值
 * @returns 是否为数组
 */
function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * 为 checkbox 应用 `v-model` 绑定。
 *
 * @param modelBinding - 传入的 v-model 绑定目标
 * @param props - 待写入的 props 对象
 * @param trackConflict - 冲突追踪回调
 */
export function applyCheckboxModelBinding(
  modelBinding: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
): void {
  const controlValue = Object.hasOwn(props, 'value') ? props.value : 'on'
  const modelValue = readModelValue(modelBinding)

  if (isUnknownArray(modelValue)) {
    const isChecked = modelValue.includes(controlValue)

    trackConflict('checked')
    props.checked = isChecked

    trackConflict('onChange')

    /* 集合模式下维护数组：选中追加，取消移除目标值。 */
    props.onChange = (event: Event) => {
      const { target } = event

      if (!target) {
        return
      }

      const input = target as HTMLInputElement
      const current = readModelValue(modelBinding)

      if (!isUnknownArray(current)) {
        setModelValue(modelBinding, input.checked ? [controlValue] : [])

        return
      }

      if (input.checked) {
        if (current.includes(controlValue)) {
          return
        }

        setModelValue(modelBinding, [...current, controlValue])

        return
      }

      /* 取消勾选时过滤掉当前值，保持其他选项不变。 */
      setModelValue(
        modelBinding,
        current.filter((item) => {
          return item !== controlValue
        }),
      )
    }

    return
  }

  trackConflict('checked')
  props.checked = Boolean(modelValue)

  trackConflict('onChange')

  /* 布尔模式：按勾选状态写回布尔值。 */
  props.onChange = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    const input = target as HTMLInputElement

    setModelValue(modelBinding, input.checked)
  }
}
