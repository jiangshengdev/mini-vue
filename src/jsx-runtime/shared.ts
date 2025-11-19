import type { ComponentChildren, ElementProps, ElementType, VNode } from '@/jsx'
import { createVNode } from '@/jsx'

/**
 * 低阶的 JSX 创建函数，直接封装到 createVNode 调用。
 */
export function createVNodeFromJSX<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  key?: PropertyKey,
): VNode<T> {
  /* 将传入的 props 封装为 createVNode 所需的参数结构 */
  return createVNode({ type, rawProps: props ?? null, key })
}

/**
 * 运行时友好的 h 函数，支持 props 与可变 children 参数。
 */
export function h<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  ...children: ComponentChildren[]
): VNode<T> {
  let key: PropertyKey | undefined
  let normalizedProps: ElementProps<T> | undefined

  /* 存在 props 时需要摘取 key 并规整剩余字段，保证与 JSX 规范对齐。 */
  if (props) {
    const { key: extractedKey, ...restProps } = props as Record<
      string,
      unknown
    > & {
      key?: PropertyKey
    }

    /* key 属于 VNode 的标识信息，提取后从 props 中剔除避免下游重复。 */
    if (Object.hasOwn(props, 'key')) {
      key = extractedKey
    }

    normalizedProps = Reflect.ownKeys(restProps).length
      ? (restProps as ElementProps<T>)
      : undefined
  }

  /* 没有额外 children 时直接透传 props，保留编译器注入的 children。 */
  if (children.length === 0) {
    return createVNodeFromJSX(type, normalizedProps, key)
  }

  /* 需要人为传入 children 时重新组装 props 并交给底层创建函数。 */
  const propsWithChildren = {
    ...(normalizedProps ?? {}),
    children,
  } as ElementProps<T>

  return createVNodeFromJSX(type, propsWithChildren, key)
}
