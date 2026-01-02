/**
 * `v-model` 转换的核心逻辑。
 *
 * 本模块仅负责「组件 v-model」转换：把 JSX 中的 `'v-model'` 语法糖转换为
 * Vue3 默认组件协议 `modelValue` + `onUpdate:modelValue`。
 *
 * @remarks
 * - DOM 表单元素的 `v-model` 适配由宿主层（如 `runtime-dom`）负责消费。
 * - 仅支持默认 `modelValue` 协议，不支持具名 v-model 与 modifiers。
 */
import { readModelValue, setModelValue } from './model.ts'
import { warnConflictProps } from './warn.ts'
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
 * 将组件 `v-model` 语法糖转换为默认的 `modelValue` 协议，并记录被覆盖的字段。
 *
 * @param type - 元素类型（原生标签或组件函数）
 * @param rawProps - 原始 props（可能携带 `v-model`）
 * @returns 转换结果及冲突列表
 */
export function transformModelBindingProps<T extends ElementType>(
  type: T,
  rawProps?: ElementProps<T>,
): TransformResult<T> {
  /* 无 props 时直接返回。 */
  if (!rawProps) {
    return { props: rawProps }
  }

  const props = rawProps as PropsWithModelBinding

  /* 未使用 `v-model` 时直接返回原 props。 */
  if (!Object.hasOwn(props, 'v-model')) {
    return { props: props as ElementProps<T> }
  }

  /* DOM 表单 v-model 由宿主层负责处理，这里保持原样透传。 */
  if (typeof type === 'string') {
    /* 触发一次读取，确保 render 阶段能收集到 v-model 绑定的响应式依赖。 */
    void readModelValue(props['v-model'])

    return { props: props as ElementProps<T> }
  }

  const modelBinding = props['v-model']
  const nextProps: PropsShape = { ...props }

  /* 移除 `v-model` 属性，并注入 `modelValue` + `onUpdate:modelValue`。 */
  Reflect.deleteProperty(nextProps, 'v-model')

  /* 收集冲突属性，用于开发模式警告。 */
  const conflicts: string[] = []
  /**
   * 记录即将被 `v-model` 覆盖的字段名，便于后续告警输出。
   *
   * @param key - 待检测的属性名
   */
  const trackConflict = (key: string) => {
    if (Object.hasOwn(nextProps, key)) {
      conflicts.push(key)
    }
  }

  trackConflict('modelValue')
  nextProps.modelValue = readModelValue(modelBinding)

  trackConflict('onUpdate:modelValue')

  /* 写回组件的 `modelValue`，保持与 Vue 组件协议一致。 */
  nextProps['onUpdate:modelValue'] = (value: unknown) => {
    setModelValue(modelBinding, value)
  }

  /* 如果存在冲突属性，在开发模式下发出警告。 */
  const label = typeof type === 'function' && type.name ? type.name : 'AnonymousComponent'

  warnConflictProps(label, conflicts, props)

  return { props: nextProps as ElementProps<T>, conflicts }
}
