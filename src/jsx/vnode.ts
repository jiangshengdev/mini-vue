const vnodeSymbol = Symbol('mini-vue-vnode')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ElementType = string | ComponentType<any> | typeof Fragment
export type ComponentType<P = Record<string, unknown>> = (
  props: P & { children?: VNodeChild[] },
) => VNodeChild | VNodeChild[] | null | undefined

export type VNodeChild = VNode | string | number

export interface VNode<P = Record<string, unknown>> {
  readonly __v_isVNode: typeof vnodeSymbol
  readonly type: ElementType
  readonly props: P | null
  readonly children: VNodeChild[]
  readonly key?: PropertyKey
}

export function Fragment(props: {
  children?: unknown
}): VNodeChild | VNodeChild[] | null {
  return (
    (props.children as VNodeChild | VNodeChild[] | null | undefined) ?? null
  )
}

interface CreateVNodeOptions<P> {
  type: ElementType
  rawProps?: P | null
  key?: PropertyKey
}

export function createVNode<P = Record<string, unknown>>(
  options: CreateVNodeOptions<P>,
): VNode<P> {
  const { type, rawProps = null, key } = options
  let props: Record<string, unknown> | null = rawProps
    ? { ...(rawProps as object) }
    : null
  let children: VNodeChild[] = []

  if (props && 'children' in props) {
    const normalized = normalizeChildren(props.children)
    delete props.children
    children = normalized
    if (Object.keys(props).length === 0) {
      props = null
    }
  }

  return {
    __v_isVNode: vnodeSymbol,
    type,
    props: (props as P | null) ?? null,
    children,
    key,
  }
}

export function isVNode(value: unknown): value is VNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__v_isVNode' in value &&
    (value as { __v_isVNode: symbol }).__v_isVNode === vnodeSymbol
  )
}

function normalizeChildren(input: unknown): VNodeChild[] {
  const result: VNodeChild[] = []
  collectChildren(input, result)
  return result
}

function collectChildren(source: unknown, target: VNodeChild[]) {
  if (source == null || typeof source === 'boolean') {
    return
  }

  if (Array.isArray(source)) {
    for (const child of source) {
      collectChildren(child, target)
    }
    return
  }

  if (isVNode(source)) {
    target.push(source)
    return
  }

  if (typeof source === 'string' || typeof source === 'number') {
    target.push(source)
    return
  }

  target.push(String(source))
}
