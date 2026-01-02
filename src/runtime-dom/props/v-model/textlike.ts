/**
 * 文本类输入元素（`input`/`textarea`）的 `v-model` 受控化实现。
 *
 * 负责将绑定值写入 `value`，并在输入或变更事件中回写 model。
 * 不处理富文本或文件输入场景，仅聚焦文本与多行文本控件。
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

  /* 为输入类控件绑定同步事件，将用户输入回写到 model。 */
  props[eventName] = (event: Event) => {
    const { target } = event

    if (!target) {
      return
    }

    const input = target as HTMLInputElement | HTMLTextAreaElement

    setModelValue(modelBinding, input.value)
  }
}
