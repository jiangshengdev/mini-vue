import { applyCheckboxModelBinding } from './checkbox.ts'
import { applyRadioModelBinding } from './radio.ts'
import { applySelectMultipleModelBinding } from './select-multiple.ts'
import { applySelectSingleModelBinding } from './select-single.ts'
import { applyTextLikeModelBinding } from './textlike.ts'
import { warnConflictProps, warnNonFormElement } from './warn.ts'
import type { ElementProps, ElementType } from '@/jsx-foundation/index.ts'
import type { PropsShape } from '@/shared/index.ts'

type PropsWithModelBinding = PropsShape & { 'v-model'?: unknown }

interface TransformResult<T extends ElementType> {
  props?: ElementProps<T>
  conflicts?: string[]
}

/**
 * 为原生表单元素将 `v-model` 转换为受控的属性与事件。
 * - 仅支持单一 `v-model`，不支持修饰符。
 * - 默认使用严格等于判断。
 * - 非表单元素出现 `v-model` 会在 Dev 下告警并移除该字段。
 */
export function transformModelBindingProps<T extends ElementType>(
  type: T,
  rawProps?: ElementProps<T>,
): TransformResult<T> {
  if (!rawProps || typeof type !== 'string') {
    return { props: rawProps }
  }

  const props = rawProps as PropsWithModelBinding

  if (!Object.hasOwn(props, 'v-model')) {
    return { props: props as ElementProps<T> }
  }

  const modelBinding = props['v-model']
  const nextProps: PropsShape = { ...props }

  Reflect.deleteProperty(nextProps, 'v-model')

  const conflicts: string[] = []
  const trackConflict = (key: string) => {
    if (Object.hasOwn(nextProps, key)) {
      conflicts.push(key)
    }
  }

  switch (type) {
    case 'input': {
      const inputType = typeof nextProps.type === 'string' ? nextProps.type.toLowerCase() : ''

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
      warnNonFormElement(type, props)

      return { props: nextProps as ElementProps<T> }
    }
  }

  warnConflictProps(type, conflicts)

  return { props: nextProps as ElementProps<T>, conflicts }
}
