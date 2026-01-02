/**
 * DOM 宿主层的 `v-model` 运行时转换。
 *
 * 本模块负责消费 VirtualNode props 中的 `'v-model'` 字段，并将其转换为
 * DOM 表单受控所需的 property + 事件绑定。
 *
 * @remarks
 * - 该转换仅在使用 `runtime-dom` 时生效，因此不管使用 JSX 还是手写 `h()`，行为保持一致。
 * - `jsx-runtime` 不再负责 DOM 表单 `v-model` 转换，以便支持非 DOM 宿主渲染器。
 */
import { applyCheckboxModelBinding } from './checkbox.ts'
import { applyRadioModelBinding } from './radio.ts'
import { applySelectMultipleModelBinding } from './select-multiple.ts'
import { applySelectSingleModelBinding } from './select-single.ts'
import { applyTextLikeModelBinding } from './textlike.ts'
import type { TrackConflict } from './types.ts'
import { warnConflictProps, warnNonFormElement } from './warn.ts'
import type { PropsShape } from '@/shared/index.ts'

type PropsWithModelBinding = PropsShape & { 'v-model'?: unknown }

/**
 * 将 `'v-model'` 转换为 DOM 表单受控所需的 props。
 *
 * @remarks
 * - 返回值会移除 `'v-model'`，避免落入 attribute patching。
 * - 若未出现 `'v-model'`，直接返回原 props 引用，减少额外对象创建。
 *
 * @param element - 绑定的宿主元素
 * @param rawProps - 原始 props 对象
 * @returns 转换后的 props，包含受控属性与事件
 */
export function transformDomModelBindingProps(element: Element, rawProps: PropsShape): PropsShape {
  if (!Object.hasOwn(rawProps, 'v-model')) {
    return rawProps
  }

  const type = element.tagName.toLowerCase()
  const props = rawProps as PropsWithModelBinding
  const modelBinding = props['v-model']
  const nextProps: PropsShape = { ...props }

  Reflect.deleteProperty(nextProps, 'v-model')

  const conflicts: string[] = []
  /**
   * 记录当前转换中与用户传入冲突的键。
   *
   * @param key - 冲突的属性名
   */
  const trackConflict: TrackConflict = (key) => {
    if (Object.hasOwn(nextProps, key)) {
      conflicts.push(key)
    }
  }

  switch (type) {
    case 'input': {
      const inputType = typeof nextProps.type === 'string' ? nextProps.type.toLowerCase() : ''

      /* checkbox/radio 拥有独立的受控策略，其余输入走文本路径。 */
      if (inputType === 'checkbox') {
        applyCheckboxModelBinding(modelBinding, nextProps, trackConflict)
      } else if (inputType === 'radio') {
        applyRadioModelBinding(modelBinding, nextProps, trackConflict)
      } else {
        applyTextLikeModelBinding(modelBinding, nextProps, trackConflict, 'onInput')
      }

      break
    }

    case 'textarea': {
      applyTextLikeModelBinding(modelBinding, nextProps, trackConflict, 'onInput')
      break
    }

    case 'select': {
      const multiple = Boolean(nextProps.multiple)

      if (multiple) {
        applySelectMultipleModelBinding(modelBinding, nextProps, trackConflict)
      } else {
        applySelectSingleModelBinding(modelBinding, nextProps, trackConflict)
      }

      break
    }

    default: {
      warnNonFormElement(type, rawProps)

      return nextProps
    }
  }

  warnConflictProps(type, conflicts, rawProps)

  return nextProps
}
