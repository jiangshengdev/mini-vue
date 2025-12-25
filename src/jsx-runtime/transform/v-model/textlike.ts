/**
 * 文本类输入元素的 `v-model` 转换实现。
 *
 * 适用于以下元素：
 * - `<input type="text|password|email|search|url|tel|number|...">` （非 checkbox/radio）
 * - `<textarea>`
 *
 * 绑定逻辑：
 * - `value` 属性直接反映绑定值
 * - 输入变更时将绑定值设置为输入框的当前值
 */
import { readModelValue, setModelValue } from './model.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 冲突追踪回调类型。
 */
type TrackConflict = (key: string) => void

/**
 * 为文本类输入元素应用 `v-model` 绑定。
 *
 * 转换规则：
 * - 注入 `value` 属性（直接使用绑定值）
 * - 注入指定的事件处理器（更新绑定值为输入框的当前值）
 *
 * @param modelBinding - `v-model` 绑定的目标（Ref 或普通值）
 * @param props - 将被修改的 props 对象
 * @param trackConflict - 冲突追踪回调
 * @param eventName - 监听的事件名（`onInput` 或 `onChange`）
 */
export function applyTextLikeModelBinding(
  modelBinding: unknown,
  props: PropsShape,
  trackConflict: TrackConflict,
  eventName: 'onInput' | 'onChange',
): void {
  trackConflict('value')
  props.value = readModelValue(modelBinding)

  trackConflict(eventName)

  props[eventName] = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    const input = target as HTMLInputElement | HTMLTextAreaElement

    setModelValue(modelBinding, input.value)
  }
}
