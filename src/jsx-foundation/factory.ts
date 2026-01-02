/**
 * `virtualNode` 工厂：提供 `Fragment` 与创建元素/文本/注释节点的能力。
 */
import { normalizeChildren } from './children.ts'
import { Comment, Text, virtualNodeFlag } from './constants.ts'
import type {
  ComponentChildren,
  ElementProps,
  ElementType,
  FragmentProps,
  VirtualNode,
  VirtualNodeChild,
} from './types.ts'
import type { PropsShape, WithOptionalProp } from '@/shared/index.ts'

/**
 * JSX 片段：不创建额外节点，直接透传 `children`。
 *
 * @param props - `Fragment` 的参数对象
 * @returns 原样返回 `props.children`
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function Fragment(props: FragmentProps): ComponentChildren {
  return props.children
}

/**
 * `createVirtualNode` 所需的参数结构，描述 `type`、原始 `props` 与 `key`。
 */
interface VirtualNodeInitOptions<T extends ElementType> {
  /** 节点类型，可能是原生标签（字符串）、组件函数或 `Fragment`。 */
  type: T
  /** 调用方传入的原始 `props`，可能包含 `children` 字段。 */
  rawProps?: ElementProps<T>
  /** 可选的稳定标识，用于 diff 过程中的节点追踪与复用。 */
  key?: PropertyKey
}

/**
 * 创建标准化的 `virtualNode`：拆分 `props.children` 并归一化为数组。
 *
 * @param options - 节点类型、原始 `props` 与可选 `key`
 * @returns 标准化后的 `virtualNode`
 */
export function createVirtualNode<T extends ElementType>(
  options: VirtualNodeInitOptions<T>,
): VirtualNode<T> {
  const { type, rawProps, key } = options
  /* 通过解构复制 `props`，避免外部对象在后续流程中被意外修改。 */
  let props: PropsShape | undefined
  let children: VirtualNodeChild[] = []

  if (rawProps) {
    /* `hasOwn` 用于区分“未传入 children”与“显式传入空值”。 */
    const hasChildren = Object.hasOwn(rawProps, 'children')
    const { children: rawChildren, ...restProps } = rawProps as WithOptionalProp<
      PropsShape,
      'children',
      unknown
    >

    if (hasChildren) {
      /* 将 `props.children` 归一化为内部统一使用的 `children` 数组。 */
      children = normalizeChildren(rawChildren)
    }

    /* 仅在 `children` 之外仍有字段时才保留 `props`，避免生成空对象。 */
    if (Reflect.ownKeys(restProps).length > 0) {
      props = restProps
    }
  }

  return {
    /* 使用唯一标记区分普通对象与内部 `virtualNode` 结构。 */
    [virtualNodeFlag]: true as const,
    type,
    props: props as ElementProps<T> | undefined,
    children,
    key,
  }
}

/**
 * 创建文本 `virtualNode`，将字符串/数字写入 `text` 字段。
 *
 * @param content - 文本内容
 * @returns 类型为 `Text` 的 `virtualNode`
 */
export function createTextVirtualNode(content: string | number): VirtualNode<typeof Text> {
  return {
    [virtualNodeFlag]: true,
    type: Text,
    props: undefined,
    children: [],
    text: String(content),
  }
}

/**
 * 创建注释 `virtualNode`，常用于“空渲染占位”等场景。
 *
 * @param content - 注释内容
 * @returns 类型为 `Comment` 的 `virtualNode`
 */
export function createCommentVirtualNode(content: string): VirtualNode<typeof Comment> {
  return {
    [virtualNodeFlag]: true,
    type: Comment,
    props: undefined,
    children: [],
    text: content,
  }
}
