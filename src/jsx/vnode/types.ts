export const vnodeSymbol = Symbol('mini-vue-vnode')

export type VNodeChild = VNode | string | number

type ComponentChildren = VNodeChild | VNodeChild[] | null

type ComponentResult = ComponentChildren | undefined

type ComponentPropsBase = Record<string, unknown>

export type FragmentProps = { children?: ComponentChildren }

type ComponentConstraint = {
  bivarianceHack(props: never): ComponentResult
}['bivarianceHack']

type PropsWithChildren<P> = P & { children?: ComponentChildren }

type BivarianceComponent<P> = {
  bivarianceHack(props: PropsWithChildren<P>): ComponentResult
}['bivarianceHack']

export type ComponentType<P extends ComponentPropsBase = ComponentPropsBase> =
  BivarianceComponent<P>

export type FragmentType = (
  props: FragmentProps,
) => VNodeChild | VNodeChild[] | null

export type ElementType = string | ComponentConstraint | FragmentType

type ComponentTypeProps<T> =
  T extends ComponentType<infer P>
    ? PropsWithChildren<P>
    : T extends (props: infer P) => ComponentResult
      ? P
      : ComponentPropsBase

export type ElementProps<T extends ElementType = ElementType> =
  T extends FragmentType
    ? FragmentProps
    : T extends string
      ? ComponentPropsBase
      : ComponentTypeProps<T>

export interface VNode<T extends ElementType = ElementType> {
  readonly __v_isVNode: typeof vnodeSymbol
  readonly type: T
  readonly props: ElementProps<T> | null
  readonly children: VNodeChild[]
  readonly key?: PropertyKey
}
