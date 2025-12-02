/**
 * 标记对象为由 mini-vue 创建的 virtualNode，用于运行时类型守卫。
 */
export const virtualNodeFlag = Symbol('isVirtualNode')

/**
 * 单个子节点的联合类型：可以是 virtualNode 或原始文本。
 */
export type VirtualNodeChild = VirtualNode | string | number

/**
 * 组件接收到的 children，可以是单个、数组、布尔值或空。
 * 布尔值会在 normalizeChildren/mountChild 中被当作空节点忽略。
 */
export type ComponentChildren =
  | VirtualNodeChild
  | VirtualNodeChild[]
  | boolean
  | undefined

/**
 * 组件渲染函数返回的结果类型。
 */
export type ComponentResult = ComponentChildren

/**
 * 组件渲染阶段需要执行的函数签名。
 */
export type ComponentRenderFunction = () => ComponentResult

/**
 * 组件 setup 函数允许返回渲染结果或渲染函数。
 */
export type ComponentSetupResult = ComponentResult | ComponentRenderFunction

/**
 * 组件 props 的基础约束：放宽为对象即可，避免要求字符串索引签名。
 */
type ComponentPropsBase = Record<string, unknown>

export interface FragmentProps extends ComponentPropsBase {
  children?: ComponentChildren
}

/**
 * 用于约束组件类型的函数签名，供 ElementType 统一推导。
 */
type ComponentConstraint = (props: never) => ComponentSetupResult

/**
 * 为任意 props 类型补充可选 children 字段。
 */
type PropsWithChildren<P> = P & { children?: ComponentChildren }

/**
 * 标准组件函数签名，默认附带 children。
 */
type ComponentFunction<P> = (
  props: PropsWithChildren<P>,
) => ComponentSetupResult

/**
 * 对外暴露的组件类型，默认 props 为通用对象。
 */
export type ComponentType<P = ComponentPropsBase> = ComponentFunction<P>

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
    : T extends (props: infer P) => ComponentSetupResult
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
 * `mini-vue` 内部使用的虚拟节点结构，承载类型、属性与子节点信息。
 */
export interface VirtualNode<T extends ElementType = ElementType> {
  /** 通过唯一 symbol 标识当前对象为 mini-vue 生成的 virtualNode */
  readonly [virtualNodeFlag]: true
  /** 当前虚拟节点的类型，可能是原生标签、组件或 Fragment */
  readonly type: T
  /** 节点携带的属性对象，按元素类型推导，允许为空 */
  readonly props?: ElementProps<T>
  /** 归一化后的子节点列表，统一以数组承载 */
  readonly children: VirtualNodeChild[]
  /** 可选的 diff key，用于稳定节点身份 */
  readonly key?: PropertyKey
}
