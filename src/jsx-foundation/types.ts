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
 * 组件渲染函数返回的结果类型，与 `ComponentChildren` 等价。
 *
 * @remarks
 * - 组件的 `render` 函数可返回单个节点、节点数组或空值。
 * - 返回 `undefined`/`null`/`boolean` 时渲染层会生成 `Comment` 占位（不产生可见 DOM 输出）。
 */
export type RenderOutput = ComponentChildren

/**
 * 组件渲染阶段需要执行的函数签名，无参数并返回 `RenderOutput`。
 *
 * @remarks
 * - `SetupComponent` 的 `setup` 阶段返回该函数，供响应式系统在依赖变更时重新调用。
 */
export type RenderFunction = () => RenderOutput

/**
 * 组件 `props` 的基础约束：放宽为对象即可，避免要求字符串索引签名。
 *
 * @remarks
 * - 复用 `@/shared` 中的 `PropsShape`，保持类型一致性。
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
 * 用于约束组件类型的函数签名，供 `ElementType` 统一推导。
 *
 * @remarks
 * - 该类型用于承载「任意 `props` 的函数组件」这一上界（类似 `∃P. SetupComponent<P>`）。
 * - 在 `strictFunctionTypes` 下，函数参数默认是逆变检查；直接用 `(props: PropsWithChildren<PropsShape>) => ...`
 *   会导致 `SetupComponent<{ msg: string }>` 等窄 `props` 组件无法赋值到该上界。
 * - 使用 bivariance hack，让 `SetupComponent<P>` 可赋值到该上界，同时避免 `(props: never)` 造成的坍缩。
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
 * JSX 中元素的类型：原生标签名、组件函数、`Fragment` 或 `Text` 标识。
 *
 * @remarks
 * - `string`：原生 HTML 标签（如 `'div'`、`'span'`）
 * - `ComponentLike`：用户定义的函数组件
 * - `FragmentType`：内置 `Fragment` 组件
 * - `typeof Text`：文本节点类型标识
 * - `typeof Comment`：注释节点类型标识（常用于空渲染占位）
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
 * `mini-vue` 内部使用的虚拟节点结构，承载类型、属性与子节点信息。
 *
 * @remarks
 * - `virtualNode` 是 JSX 转换后的运行时表示，由 `createVirtualNode` 创建。
 * - 渲染层（`runtime-core`）根据 `type` 字段分发到不同的挂载/更新逻辑。
 * - 所有字段均为只读，确保节点创建后不可变。
 *
 * @beta
 */
export interface VirtualNode<T extends ElementType = ElementType> {
  /** 通过唯一 symbol 标识当前对象为 `mini-vue` 生成的 `virtualNode`。 */
  readonly [virtualNodeFlag]: true
  /** 当前虚拟节点的类型，可能是原生标签、组件函数、`Fragment` 或 `Text`。 */
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
