import { normalizeChildren } from './children.ts'
import { Text, virtualNodeFlag } from './constants.ts'
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
 * JSX 片段组件，不创建额外节点，直接返回 `children`。
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
  /** 节点类型，可能是原生标签、组件或 `Fragment`。 */
  type: T
  /** 调用方传入的原始 `props`，可能包含 `children` 字段。 */
  rawProps?: ElementProps<T>
  /** 可选的稳定标识，用于 diff 过程中的节点追踪。 */
  key?: PropertyKey
}

/**
 * 根据传入的类型与 `props` 创建标准化的 `virtualNode` 节点。
 *
 * @remarks
 * - 通过复制 `props` 将外部对象与内部状态隔离，避免后续 `render` 阶段被意外篡改。
 * - `children` 会被单独归一化为数组，其余字段按需保留，防止生成空 `props` 对象。
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

    // 仅在 `children` 之外仍有有效字段时才保留 `props`，避免生成空对象
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
