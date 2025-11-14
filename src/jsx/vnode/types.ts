/**
 * 标记对象为由 mini-vue 创建的 VNode，用于运行时类型守卫。
 */
export const vnodeSymbol = Symbol('mini-vue-vnode')

/**
 * 单个子节点的联合类型：可以是 VNode 或原始文本。
 */
export type VNodeChild = VNode | string | number

/**
 * 组件接收到的 children，可以是单个、数组或空。
 */
export type ComponentChildren = VNodeChild | VNodeChild[] | null

/**
 * 组件渲染函数返回的结果类型。
 */
export type ComponentResult = ComponentChildren | undefined

/**
 * 组件 props 的基础约束：放宽为对象即可，避免要求字符串索引签名。
 */
type ComponentPropsBase = object

/**
 * Fragment 组件的 props，仅支持可选的 children。
 */
export type FragmentProps = { children?: ComponentChildren }

/**
 * 用于约束组件类型的函数签名，供 ElementType 统一推导。
 */
type ComponentConstraint = (props: never) => ComponentResult

/**
 * 为任意 props 类型补充可选 children 字段。
 */
type PropsWithChildren<P> = P & { children?: ComponentChildren }

/**
 * 标准组件函数签名，默认附带 children。
 */
type ComponentFunction<P> = (props: PropsWithChildren<P>) => ComponentResult

/**
 * 对外暴露的组件类型，默认 props 为通用对象。
 */
export type ComponentType<P extends ComponentPropsBase = ComponentPropsBase> =
  ComponentFunction<P>

/**
 * Fragment 类型定义，接收 FragmentProps 并返回一组子节点。
 */
export type FragmentType = (props: FragmentProps) => ComponentChildren

/**
 * JSX 中元素的类型：原生标签名、组件或 Fragment。
 */
export type ElementType = string | ComponentConstraint | FragmentType

/**
 * 推导给定元素类型对应的 props 形状。
 */
type ComponentTypeProps<T> =
  T extends ComponentType<infer P>
    ? PropsWithChildren<P>
    : T extends (props: infer P) => ComponentResult
      ? P
      : ComponentPropsBase

/**
 * 统一描述不同元素类型的 props：
 * - Fragment 使用 FragmentProps
 * - 原生标签为任意属性对象
 * - 组件则回退到其 props 类型推导
 */
export type ElementProps<T extends ElementType = ElementType> =
  T extends FragmentType
    ? FragmentProps
    : T extends string
      ? ComponentPropsBase
      : ComponentTypeProps<T>

/**
 * mini-vue 内部使用的虚拟节点结构，承载类型、属性与子节点信息。
 */
export interface VNode<T extends ElementType = ElementType> {
  readonly __v_isVNode: typeof vnodeSymbol
  readonly type: T
  readonly props: ElementProps<T> | null
  readonly children: VNodeChild[]
  readonly key?: PropertyKey
}
