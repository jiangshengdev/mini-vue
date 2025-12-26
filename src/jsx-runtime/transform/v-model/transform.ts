/**
 * `v-model` 转换的核心逻辑。
 *
 * 本模块负责将 JSX 中的 `v-model` 属性转换为原生表单元素的受控模式：
 * - `<input type="text">` / `<textarea>` → `value` + `onInput`
 * - `<input type="checkbox">` → `checked` + `onChange`（支持数组绑定）
 * - `<input type="radio">` → `checked` + `onChange`
 * - `<select>` → `value` + `onChange`（支持单选/多选）
 *
 * 限制：
 * - 仅支持原生表单元素，不支持自定义组件
 * - 仅支持单一 `v-model`，不支持修饰符（如 `.lazy`、`.number`）
 * - 使用严格等于（`===`）进行值比较
 */
import { applyCheckboxModelBinding } from './checkbox.ts'
import { applyRadioModelBinding } from './radio.ts'
import { applySelectMultipleModelBinding } from './select-multiple.ts'
import { applySelectSingleModelBinding } from './select-single.ts'
import { applyTextLikeModelBinding } from './textlike.ts'
import { warnConflictProps, warnNonFormElement } from './warn.ts'
import type { ElementProps, ElementType } from '@/jsx-foundation/index.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 包含可选 `v-model` 属性的 props 类型。
 */
type PropsWithModelBinding = PropsShape & { 'v-model'?: unknown }

/**
 * `transformModelBindingProps` 的返回结果。
 */
interface TransformResult<T extends ElementType> {
  /** 转换后的 props（已移除 `v-model` 并注入受控属性与事件）。 */
  props?: ElementProps<T>
  /** 检测到的冲突属性名列表（如同时存在 `v-model` 和 `value`）。 */
  conflicts?: string[]
}

/**
 * 将 `v-model` 转换为原生表单元素的受控属性与事件。
 *
 * 转换规则：
 * - `<input type="text|password|email|...">` → `value` + `onInput`
 * - `<input type="checkbox">` → `checked` + `onChange`
 * - `<input type="radio">` → `checked` + `onChange`
 * - `<textarea>` → `value` + `onInput`
 * - `<select>` → `value` + `onChange`
 *
 * 冲突检测：
 * - 如果 props 中已存在将被覆盖的属性（如 `value`、`checked`、`onChange`），
 *   会记录到 `conflicts` 数组并在开发模式下发出警告。
 *
 * 非表单元素处理：
 * - 如果在非表单元素上使用 `v-model`，会在开发模式下发出警告并移除该属性。
 *
 * @param type - 元素类型（原生标签名或组件函数）
 * @param rawProps - 原始 props（可能包含 `v-model`）
 * @returns 转换结果，包含处理后的 props 和冲突列表
 */
export function transformModelBindingProps<T extends ElementType>(
  type: T,
  rawProps?: ElementProps<T>,
): TransformResult<T> {
  /* 无 props 或非原生元素时直接返回。 */
  if (!rawProps || typeof type !== 'string') {
    return { props: rawProps }
  }

  const props = rawProps as PropsWithModelBinding

  /* 未使用 `v-model` 时直接返回原 props。 */
  if (!Object.hasOwn(props, 'v-model')) {
    return { props: props as ElementProps<T> }
  }

  const modelBinding = props['v-model']
  const nextProps: PropsShape = { ...props }

  /* 移除 `v-model` 属性，后续由具体的 apply 函数注入受控属性。 */
  Reflect.deleteProperty(nextProps, 'v-model')

  /* 收集冲突属性，用于开发模式警告。 */
  const conflicts: string[] = []
  const trackConflict = (key: string) => {
    if (Object.hasOwn(nextProps, key)) {
      conflicts.push(key)
    }
  }

  /* 根据元素类型分发到对应的转换函数。 */
  switch (type) {
    case 'input': {
      const inputType = typeof nextProps.type === 'string' ? nextProps.type.toLowerCase() : ''

      if (inputType === 'checkbox') {
        applyCheckboxModelBinding(modelBinding, nextProps, trackConflict)
      } else if (inputType === 'radio') {
        applyRadioModelBinding(modelBinding, nextProps, trackConflict)
      } else {
        /* 其他 input 类型（text、password、email 等）统一使用 textlike 处理。 */
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
      /* 非表单元素使用 `v-model` 时发出警告并移除该属性。 */
      warnNonFormElement(type, props)

      return { props: nextProps as ElementProps<T> }
    }
  }

  /* 如果存在冲突属性，在开发模式下发出警告。 */
  warnConflictProps(type, conflicts, props)

  return { props: nextProps as ElementProps<T>, conflicts }
}
