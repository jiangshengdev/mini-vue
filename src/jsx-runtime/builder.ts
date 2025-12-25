/**
 * VirtualNode 构建器，负责将 JSX 调用参数转换为 VirtualNode。
 *
 * 本模块是 `jsx`/`jsxs`/`jsxDEV`/`h` 的底层实现，主要职责：
 * 1. 从 `props` 中提取并归一化 `key`（显式参数优先于 `props.key`）
 * 2. 应用 `v-model` 转换（将声明式绑定转换为受控属性与事件）
 * 3. 调用 `createVirtualNode` 创建最终的 VirtualNode
 */
import { transformModelBindingProps } from './transform/index.ts'
import type {
  ComponentChildren,
  ElementProps,
  ElementType,
  VirtualNode,
} from '@/jsx-foundation/index.ts'
import { createVirtualNode } from '@/jsx-foundation/index.ts'
import type { PropsShape, WithOptionalProp } from '@/shared/index.ts'

/**
 * `extractKeyedProps` 的返回结果。
 *
 * 记录从 `props` 中剥离 `key` 后的副本与归一化的 `key` 值。
 */
interface NormalizedPropsResult<T extends ElementType> {
  /**
   * 组件最终使用的唯一 `key`。
   * 来源优先级：显式参数 > `props.key` > `undefined`。
   */
  key?: PropertyKey
  /**
   * 移除 `key` 字段后的 `props` 副本。
   * 若剥离后无剩余字段，则为 `undefined`，避免创建空对象。
   */
  props?: ElementProps<T>
}

/**
 * 从 `props` 中提取 `key` 并返回剩余属性。
 *
 * `key` 的来源优先级：
 * 1. 显式传入的 `explicitKey` 参数（`jsx` 第三个参数）
 * 2. `props.key` 字段（仅当 `props` 显式声明了 `key` 时才读取）
 *
 * 注意：使用 `Object.hasOwn` 检查 `key` 是否存在，避免误读原型链上的值或解构默认值。
 *
 * @param props - 原始 props 对象
 * @param explicitKey - 显式传入的 key 值（来自 `jsx` 第三个参数）
 * @returns 归一化后的 key 与剩余 props
 */
function extractKeyedProps<T extends ElementType>(
  props?: ElementProps<T>,
  explicitKey?: PropertyKey,
): NormalizedPropsResult<T> {
  /* 未提供 `props` 时直接返回显式 `key`。 */
  if (!props) {
    return { key: explicitKey }
  }

  const { key: extractedKey, ...restProps } = props as WithOptionalProp<
    PropsShape,
    'key',
    PropertyKey
  >

  /* 显式 `key`（`jsx` 第三个参数）优先，其次再尝试 `props.key`。 */
  /* 当 `props` 未显式声明 `key` 字段时，不读取解构出的 `extractedKey`，避免误用默认值。 */
  const normalizedKey = explicitKey ?? (Object.hasOwn(props, 'key') ? extractedKey : undefined)

  /* 仅在剥离 `key` 后仍有字段时返回 `props`，减少空对象创建。 */
  const hasRestProps = Reflect.ownKeys(restProps).length > 0

  return {
    key: normalizedKey,
    props: hasRestProps ? (restProps as ElementProps<T>) : undefined,
  }
}

/**
 * 构建 VirtualNode 的核心函数。
 *
 * 处理流程：
 * 1. 调用 `extractKeyedProps` 提取 `key` 并获取剩余 `props`
 * 2. 调用 `transformModelBindingProps` 处理 `v-model` 绑定
 * 3. 调用 `createVirtualNode` 创建最终的 VirtualNode
 *
 * 此函数是 `jsx`/`jsxs`/`jsxDEV`/`h` 的共同底层实现。
 *
 * @param type - 元素类型（原生标签名或组件函数）
 * @param props - 元素属性（可能包含 `key` 和 `v-model`）
 * @param key - 显式传入的 key 值
 * @returns 构建好的 VirtualNode
 */
export function buildVirtualNode<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  key?: PropertyKey,
): VirtualNode<T> {
  /* 统一抽取 `key`，避免 `createVirtualNode` 再次处理同一字段。 */
  const { key: resolvedKey, props: normalizedProps } = extractKeyedProps(props, key)

  /* 应用 `v-model` 转换，将声明式绑定转换为受控属性与事件。 */
  const { props: transformedProps } = transformModelBindingProps(type, normalizedProps)

  return createVirtualNode({
    type,
    rawProps: transformedProps,
    key: resolvedKey,
  })
}

/**
 * 运行时友好的 `h` 函数，支持可变 `children` 参数。
 *
 * 与 `jsx` 系列函数的区别：
 * - `jsx` 由编译器调用，`children` 已合并到 `props` 中
 * - `h` 供用户手动调用，`children` 作为独立的可变参数传入
 *
 * 使用示例：
 * ```ts
 * h('div', { class: 'container' }, child1, child2, child3)
 * h(MyComponent, { value: 1 })  // 无额外 children 时直接透传 props
 * ```
 *
 * @param type - 元素类型（原生标签名或组件函数）
 * @param props - 元素属性
 * @param children - 可变子节点参数
 * @returns 构建好的 VirtualNode
 *
 * @public
 */
export function h<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  ...children: ComponentChildren[]
): VirtualNode<T> {
  /* 没有额外 `children` 时直接透传 `props`，保留编译器注入的 `children`。 */
  if (children.length === 0) {
    return buildVirtualNode(type, props)
  }

  /* 有额外 `children` 时，将其合并到 `props` 中再交由 `buildVirtualNode` 处理。 */
  const emptyProps: ElementProps<T> = Object.create(null) as ElementProps<T>
  const propsWithChildren: ElementProps<T> = {
    ...(props ?? emptyProps),
    children,
  }

  return buildVirtualNode(type, propsWithChildren)
}
