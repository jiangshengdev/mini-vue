import type { PropsShape } from '@/shared/index.ts'
import type { virtualNodeFlag } from '@/jsx-foundation/virtual-node/constants.ts'

/**
 * 单个子节点的联合类型：可以是 virtualNode 或原始文本。
 */
export type VirtualNodeChild = VirtualNode | string | number

/**
 * 组件接收到的 children，可以是单个、数组、布尔值或空。
 * 由于 lint 规则禁止在类型中显式声明 `null`，这里以 `undefined` 代表“空”，
 * 运行时（normalizeChildren/mountChild）仍会照常处理 `null` 并视为可忽略节点。
 * 布尔值同样会在运行时被当作空节点忽略。
 */
export type ComponentChildren = VirtualNodeChild | VirtualNodeChild[] | boolean | undefined

/**
 * 组件渲染函数返回的结果类型。
 */
export type ComponentResult = ComponentChildren

/**
 * 组件渲染阶段需要执行的函数签名。
 */
export type ComponentRenderFunction = () => ComponentResult

/**
 * 组件 props 的基础约束：放宽为对象即可，避免要求字符串索引签名。
 */
type ComponentPropsBase = PropsShape

export interface FragmentProps extends ComponentPropsBase {
  children?: ComponentChildren
}

/**
 * 用于约束组件类型的函数签名，供 ElementType 统一推导。
 */
type ComponentConstraint = (props: never) => ComponentRenderFunction

/**
 * 为任意 props 类型补充可选 children 字段。
 */
type PropsWithChildren<P> = P & { children?: ComponentChildren }

/**
 * 标准组件函数签名，默认附带 children。
 */
type ComponentFunction<P> = (props: PropsWithChildren<P>) => ComponentRenderFunction

/**
 * `setup` + `render` 语义的函数组件类型，默认 props 为通用对象。
 *
 * @beta
 */
export type SetupFunctionComponent<P = ComponentPropsBase> = ComponentFunction<P>

/**
 * Fragment 类型定义，接收 FragmentProps 并返回一组子节点。
 */
export type FragmentType = (props: FragmentProps) => ComponentChildren

/**
 * JSX 中元素的类型：原生标签名、组件或 Fragment。
 *
 * @beta
 */
export type ElementType = string | ComponentConstraint | FragmentType

/**
 * 推导给定元素类型对应的 props 形状。
 */
type InferComponentProps<T> =
  T extends SetupFunctionComponent<infer Props>
    ? PropsWithChildren<Props>
    : T extends (props: infer Props) => ComponentRenderFunction
      ? Props
      : ComponentPropsBase

/**
 * 统一描述不同元素类型的 props：
 * - Fragment 使用 FragmentProps
 * - 原生标签为任意属性对象
 * - 组件则回退到其 props 类型推导
 */
export type ElementProps<T extends ElementType = ElementType> = T extends FragmentType
  ? FragmentProps
  : T extends string
    ? ComponentPropsBase
    : InferComponentProps<T>

/**
 * `mini-vue` 内部使用的虚拟节点结构，承载类型、属性与子节点信息。
 *
 * @beta
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
