import type {
  ComponentChildren,
  ElementProps,
  ElementType,
  VirtualNode,
} from '@/jsx/index.ts'
import { createVirtualNode } from '@/jsx/index.ts'
import type { PropsShape } from '@/shared/types.ts'

/**
 * 记录剥离 key 后的 props 副本与归一化的 key 值。
 */
interface NormalizedPropsResult<T extends ElementType> {
  /** 组件最终使用的唯一 key，来源于 props 或显式参数。 */
  key?: PropertyKey
  /** 移除 key 字段后的 props 副本，若为空则省略。 */
  props?: ElementProps<T>
}

/**
 * 优先使用显式传入的 key，再回退到 props.key，并返回剩余 props。
 */
function extractKeyedProps<T extends ElementType>(
  props?: ElementProps<T>,
  explicitKey?: PropertyKey,
): NormalizedPropsResult<T> {
  /* 未提供 props 时保持 key 的原始语义即可。 */
  if (!props) {
    return { key: explicitKey }
  }

  const { key: extractedKey, ...restProps } = props as PropsShape & {
    key?: PropertyKey
  }

  /* 显式 key（jsx 第三个参数）优先，其次再尝试 props.key。 */
  const normalizedKey =
    explicitKey ?? (Object.hasOwn(props, 'key') ? extractedKey : undefined)
  const hasRestProps = Reflect.ownKeys(restProps).length > 0

  return {
    key: normalizedKey,
    props: hasRestProps ? (restProps as ElementProps<T>) : undefined,
  }
}

/**
 * 低阶的 JSX 创建函数，直接封装到 createVirtualNode 调用。
 */
export function buildVirtualNode<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  key?: PropertyKey,
): VirtualNode<T> {
  /* 统一抽取 key，避免 createVirtualNode 再次处理同一字段。 */
  const { key: resolvedKey, props: normalizedProps } = extractKeyedProps(
    props,
    key,
  )

  /* 将传入的 props 封装为 createVirtualNode 所需的参数结构 */
  return createVirtualNode({
    type,
    rawProps: normalizedProps,
    key: resolvedKey,
  })
}

/**
 * 运行时友好的 h 函数，支持 props 与可变 children 参数。
 */
export function h<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  ...children: ComponentChildren[]
): VirtualNode<T> {
  /* 保持手写 h 与编译产物在 key 处理上的一致性。 */
  const { key, props: normalizedProps } = extractKeyedProps(props)

  /* 没有额外 children 时直接透传 props，保留编译器注入的 children。 */
  if (children.length === 0) {
    /* 该分支用于复刻 jsx 单子节点调用语义，不需重建 props。 */
    return buildVirtualNode(type, normalizedProps, key)
  }

  /* 需要人为传入 children 时重新组装 props 并交给底层创建函数。 */
  const propsWithChildren: ElementProps<T> = {
    /* `normalizedProps` 可能为空，此处回退到空对象以便附加 children。 */
    ...(normalizedProps ?? ({} as ElementProps<T>)),
    children,
  }

  return buildVirtualNode(type, propsWithChildren, key)
}
