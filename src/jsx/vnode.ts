const vnodeSymbol = Symbol('mini-vue-vnode')

export type VNodeChild = VNode | string | number
type ComponentChildren = VNodeChild | VNodeChild[] | null
type ComponentResult = ComponentChildren | undefined
type ComponentPropsBase = Record<string, unknown>
type FragmentProps = { children?: ComponentChildren }
type ComponentConstraint = {
  bivarianceHack(props: never): ComponentResult
}['bivarianceHack']

type PropsWithChildren<P> = P & { children?: ComponentChildren }
type BivarianceComponent<P> = {
  bivarianceHack(props: PropsWithChildren<P>): ComponentResult
}['bivarianceHack']

export type ComponentType<P extends ComponentPropsBase = ComponentPropsBase> =
  BivarianceComponent<P>

export type ElementType = string | ComponentConstraint | typeof Fragment

export type ElementProps<T extends ElementType = ElementType> =
  T extends typeof Fragment
    ? FragmentProps
    : T extends string
      ? ComponentPropsBase
      : ComponentTypeProps<T>

type ComponentTypeProps<T> =
  T extends ComponentType<infer P>
    ? PropsWithChildren<P>
    : T extends (props: infer P) => ComponentResult
      ? P
      : ComponentPropsBase

export interface VNode<T extends ElementType = ElementType> {
  readonly __v_isVNode: typeof vnodeSymbol
  readonly type: T
  readonly props: ElementProps<T> | null
  readonly children: VNodeChild[]
  readonly key?: PropertyKey
}

export function Fragment(props: FragmentProps): VNodeChild | VNodeChild[] | null {
  return (
    (props.children as VNodeChild | VNodeChild[] | null | undefined) ?? null
  )
}

interface CreateVNodeOptions<T extends ElementType> {
  type: T
  rawProps?: ElementProps<T> | null
  key?: PropertyKey
}

export function createVNode<T extends ElementType>(
  options: CreateVNodeOptions<T>,
): VNode<T> {
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
    props: (props as ElementProps<T> | null) ?? null,
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
