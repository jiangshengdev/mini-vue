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
 * JSX 片段组件，不创建额外 DOM 节点，直接返回 `children`。
 *
 * @remarks
 * - `Fragment` 用于包裹多个子节点而不引入额外的 DOM 层级。
 * - JSX 中的 `<></>` 语法会被转换为 `Fragment` 调用。
 * - 返回值直接透传 `children`，由上层渲染逻辑处理。
 *
 * @param props - 包含 `children` 字段的参数对象
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
 * 根据传入的类型与 `props` 创建标准化的 `virtualNode` 节点。
 *
 * @remarks
 * - 通过解构复制 `props`，将外部对象与内部状态隔离，避免后续 `render` 阶段被意外篡改。
 * - `children` 会被单独提取并归一化为数组，其余字段按需保留。
 * - 若 `children` 之外无其他有效字段，`props` 将为 `undefined`，避免生成空对象。
 *
 * @param options - 包含 `type`、`rawProps`、`key` 的初始化选项
 * @returns 标准化的 `VirtualNode` 对象
 */
export function createVirtualNode<T extends ElementType>(
  options: VirtualNodeInitOptions<T>,
): VirtualNode<T> {
  const { type, rawProps, key } = options
  /* 通过解构复制 `props`，避免外部对象在后续流程中被意外修改 */
  let props: PropsShape | undefined
  let children: VirtualNodeChild[] = []

  if (rawProps) {
    /* `hasOwn` 能区分「未传入 `children`」与「显式传入 `undefined`/`null`」的差异 */
    const hasChildren = Object.hasOwn(rawProps, 'children')
    const { children: rawChildren, ...restProps } = rawProps as WithOptionalProp<
      PropsShape,
      'children',
      unknown
    >

    if (hasChildren) {
      /* 将 `props.children` 归一化为内部统一使用的 `children` 数组 */
      children = normalizeChildren(rawChildren)
    }

    /* 仅在 `children` 之外仍有有效字段时才保留 `props`，避免生成空对象 */
    if (Reflect.ownKeys(restProps).length > 0) {
      props = restProps
    }
  }

  return {
    /* 使用唯一标记区分普通对象与内部 `virtualNode` 结构 */
    [virtualNodeFlag]: true as const,
    type,
    props: props as ElementProps<T> | undefined,
    children,
    key,
  }
}

/**
 * 创建文本 `virtualNode`，将原始字符串/数字包装为统一的渲染节点。
 *
 * @remarks
 * - 文本节点的 `type` 为 `Text` 符号，`children` 为空数组。
 * - 文本内容存储在 `text` 字段，渲染层据此创建 DOM 文本节点。
 * - 数字会被转换为字符串存储。
 *
 * @param content - 文本内容，可以是字符串或数字
 * @returns 类型为 `Text` 的 `VirtualNode` 对象
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
 * 创建注释 `virtualNode`，用于表示空渲染占位或开发态标记。
 *
 * @remarks
 * - 注释节点的 `type` 为 `Comment` 符号，`children` 为空数组。
 * - 注释内容存储在 `text` 字段，渲染层据此创建宿主注释节点。
 *
 * @param content - 注释内容
 * @returns 类型为 `Comment` 的 `VirtualNode` 对象
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
