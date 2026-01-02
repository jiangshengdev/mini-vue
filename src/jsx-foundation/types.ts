/**
 * `jsx-foundation` 类型定义：描述 `virtualNode`、组件与 `children` 的公共结构。
 */
import type { Comment, Text, virtualNodeFlag } from './constants.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 单个子节点的联合类型：可以是 `virtualNode` 或原始文本（字符串/数字）。
 *
 * @remarks
 * - 字符串与数字在渲染层会被 `createTextVirtualNode` 包装为文本节点。
 * - 该类型是 `children` 数组的元素类型，不包含 `null`/`undefined`/`boolean` 等可忽略值。
 */
export type VirtualNodeChild = VirtualNode | string | number

/**
 * 组件接收到的 `children` 类型，支持单个、数组、布尔值或空。
 *
 * @remarks
 * - 项目约定类型层不出现 `null`，以 `undefined` 表示「空」。
 * - 运行时（`normalizeChildren`/`mountChild`）仍兼容用户传入的 `null`，并将其视为可忽略节点。
 * - 布尔值与空值会在运行时被归一化为 `Comment` 节点占位，便于条件渲染场景（如 `{flag && <Comp />}`）。
 */
export type ComponentChildren = VirtualNodeChild | VirtualNodeChild[] | boolean | undefined

/**
 * 组件渲染函数返回值类型（与 `ComponentChildren` 等价）。
 */
export type RenderOutput = ComponentChildren

/**
 * 组件渲染闭包的函数签名（无参数，返回 `RenderOutput`）。
 */
export type RenderFunction = () => RenderOutput

/**
 * 组件 `props` 的基础约束：统一为对象形状。
 */
type ComponentPropsBase = PropsShape

/**
 * 片段组件（`Fragment`）的参数结构，当前仅透传 `children` 字段。
 *
 * @remarks
 * - `Fragment` 不创建额外 DOM 节点，仅用于包裹多个子节点。
 */
export interface FragmentProps extends ComponentPropsBase {
  /** 片段需要渲染的一组子节点，保持传入顺序与原样。 */
  children?: ComponentChildren
}

/**
 * 为任意 `props` 类型补充可选 `children` 字段。
 *
 * @remarks
 * - JSX 转换时 `children` 会被自动注入到 `props` 中，该类型确保类型推导正确。
 */
type PropsWithChildren<P> = P & { children?: ComponentChildren }

/**
 * 任意函数组件的上界类型，用于 `ElementType` 推导（通过 bivariance hack 兼容 `strictFunctionTypes`）。
 */
type ComponentLike = {
  bivarianceHack(props: unknown): RenderFunction
}['bivarianceHack']

/**
 * `setup` + `render` 语义的函数组件类型，默认 `props` 为通用对象。
 *
 * @remarks
 * - 组件函数接收 `props`（含可选 `children`），返回一个 `RenderFunction`。
 * - `setup` 阶段可执行副作用、创建响应式状态，返回的 `render` 函数负责生成 `virtualNode`。
 *
 * @beta
 */
export type SetupComponent<P = ComponentPropsBase> = (props: PropsWithChildren<P>) => RenderFunction

/**
 * `Fragment` 类型定义，接收 `FragmentProps` 并返回一组子节点。
 *
 * @remarks
 * - `Fragment` 是特殊的「透传」组件，不创建 DOM 节点，直接返回 `children`。
 */
export type FragmentType = (props: FragmentProps) => ComponentChildren

/**
 * JSX 中元素的类型：原生标签、组件函数、`Fragment`、`Text` 或 `Comment` 标识。
 *
 * @beta
 */
export type ElementType = string | ComponentLike | FragmentType | typeof Text | typeof Comment

/**
 * 推导给定元素类型对应的 `props` 形状。
 *
 * @remarks
 * - 若 `T` 是 `SetupComponent<Props>`，则提取 `Props` 并附加 `children`。
 * - 若 `T` 是普通函数组件，则直接提取其参数类型。
 * - 其他情况回退到 `ComponentPropsBase`。
 */
type InferComponentProps<T> =
  T extends SetupComponent<infer Props>
    ? unknown extends Props
      ? PropsWithChildren<ComponentPropsBase>
      : PropsWithChildren<Props>
    : T extends (props: infer Props) => RenderFunction
      ? Props
      : ComponentPropsBase

/**
 * 统一描述不同元素类型的 `props`：
 * - `Fragment` 使用 `FragmentProps`
 * - 原生标签为任意属性对象（`ComponentPropsBase`）
 * - 组件则回退到其 `props` 类型推导
 *
 * @remarks
 * - 该类型用于 `createVirtualNode` 的参数约束，确保类型安全。
 */
export type ElementProps<T extends ElementType = ElementType> = T extends FragmentType
  ? FragmentProps
  : T extends string
    ? ComponentPropsBase
    : InferComponentProps<T>

/**
 * `mini-vue` 内部的虚拟节点结构，承载 `type/props/children` 等渲染所需信息。
 *
 * @beta
 */
export interface VirtualNode<T extends ElementType = ElementType> {
  /** 通过唯一 symbol 标识当前对象为 `mini-vue` 生成的 `virtualNode`。 */
  readonly [virtualNodeFlag]: true
  /** 当前虚拟节点的类型，可能是原生标签、组件函数、`Fragment`、`Text` 或 `Comment`。 */
  readonly type: T
  /** 节点携带的 `props` 对象，按元素类型推导；若无有效属性则为 `undefined`。 */
  readonly props?: ElementProps<T>
  /** 归一化后的 `children` 列表，统一以数组承载，不含 `null`/`undefined`/`boolean`。 */
  readonly children: VirtualNodeChild[]
  /** 可选的 diff `key`，用于稳定节点身份，提升列表更新性能。 */
  readonly key?: PropertyKey
  /** 文本/注释节点的内容，仅在 `type` 为 `Text`/`Comment` 时存在。 */
  readonly text?: string
}
