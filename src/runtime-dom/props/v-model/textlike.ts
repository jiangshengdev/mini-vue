/**
 * 文本类输入元素的 `v-model` 转换实现。
 */
import { readModelValue, setModelValue } from './model.ts'
import type { TrackConflict } from './types.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 为文本类输入元素应用 `v-model` 绑定。
 *
 * @param modelBinding - 传入的 v-model 绑定目标
 * @param props - 待写入的 props 对象
 * @param trackConflict - 冲突追踪回调
 * @param eventName - 触发同步的事件名称
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
