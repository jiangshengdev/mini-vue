import type { ElementProps, ElementType, VNode, VNodeChild } from '@/jsx/vnode'
import { createVNode } from '@/jsx/vnode'

/**
 * 低阶的 JSX 创建函数，直接封装到 createVNode 调用。
 */
export function createJSXNode<T extends ElementType>(
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
  ...children: VNodeChild[]
) {
  if (children.length === 0) {
    /* 没有通过可变参数传入 children 时保留原 props.children */
    return createJSXNode(type, props)
  }

  /* 将剩余参数收集到 children 字段中，再交给 createJSXNode 统一处理 */
  const normalizedProps = {
    ...(props ?? {}),
    children,
  } as ElementProps<T>
  return createJSXNode(type, normalizedProps)
}
