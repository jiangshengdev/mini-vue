import type {
  ElementProps,
  ElementType as VirtualNodeType,
  VirtualNode,
} from '@/jsx-foundation/index.ts'
import type { ElementRef } from '@/runtime-dom/index.ts'
import type { Ref } from '@/reactivity/index.ts'
import type { PropsShape } from '@/shared/index.ts'

/** `v-model` 支持可写 `Ref` 或可写左值，编译期会为非 Ref 生成写回闭包。 */
type ModelBinding = Ref | unknown

/** 组件 `v-model` 语法糖注入的 props（默认 `modelValue` 协议）。 */
interface ComponentModelBindingProps {
  'v-model'?: ModelBinding
}

/** JSX 属性接受的宽松取值集合，交由运行时做最终处理。 */
type AttributeValue<T> = T | string | number | boolean | undefined

/** `style` 在 JSX 场景下允许的写法汇总。 */
type StyleProp = Partial<CSSStyleDeclaration> | Record<string, string | number> | string | boolean

/** `class`/`className` 允许的宽松写法，具体归一化由运行时处理。 */
type ClassValue = unknown

/**
 * 将元素实例字段映射为可写属性，排除 `children` 与 `style` 以便上层重载。
 */
type ElementFieldsMap<E extends Element = Element> = Omit<
  { [K in keyof E]?: AttributeValue<E[K]> },
  'children' | 'style' | 'class' | 'className'
>

/** 单个事件属性的取值，支持标准回调与宽松原始值。 */
type EventPropValue<K extends keyof HTMLElementEventMap> =
  | ((event: HTMLElementEventMap[K]) => void)
  | AttributeValue<HTMLElementEventMap[K]>

/** DOM 事件名到 `onXxx` prop 的映射。 */
type NativeEventProps = {
  [K in keyof HTMLElementEventMap as `on${Capitalize<K>}`]?: EventPropValue<K>
}

/**
 * 内置元素在 JSX 中的属性定义，组合基础属性、`style`/`children` 与事件映射。
 */
type NativeElementProps<E extends Element = Element> = PropsShape &
  ElementFieldsMap<E> & {
    children?: unknown
    style?: StyleProp
    class?: ClassValue
    className?: ClassValue
  } & NativeEventProps

/** HTML 标签到属性定义的映射。 */
type HtmlIntrinsicElements = {
  [K in keyof HTMLElementTagNameMap]: NativeElementProps<HTMLElementTagNameMap[K]>
} & {
  input: NativeElementProps<HTMLInputElement> & { 'v-model'?: ModelBinding }
  textarea: NativeElementProps<HTMLTextAreaElement> & { 'v-model'?: ModelBinding }
  select: NativeElementProps<HTMLSelectElement> & { 'v-model'?: ModelBinding }
}

/**
 * SVG 标签到属性定义的映射，排除与 HTML 重名的标签以避免属性类型交叉。
 */
type SvgIntrinsicElements = {
  [K in Exclude<keyof SVGElementTagNameMap, keyof HTMLElementTagNameMap>]: NativeElementProps<
    SVGElementTagNameMap[K]
  >
}

/**
 * 为 TypeScript 提供 mini-vue `JSX` 环境下的类型声明。
 */
declare global {
  namespace JSX {
    /** 单个 `JSX` 表达式最终对应的虚拟节点类型。 */
    type Element = VirtualNode

    /** `JSX` 标签名可以是原生标签、组件或 `Fragment`。 */
    type ElementType = VirtualNodeType

    /**
     * 将组件类型映射为其可接受的 `props` 类型。
     *
     * @remarks
     * - 该类型用于驱动 TSX 的属性检查：当标签为组件（非 intrinsic）时，TS 会通过它规整最终 `props`。
     * - 这里统一复用 `jsx-foundation` 的 `ElementProps` 推导链：
     *   - 具体组件：保留精确 `props` 推导（如 `SetupComponent<{ msg: string }>`）。
     *   - 动态/擦除组件（如 `ElementType` 容器）：回退为宽松 `PropsShape`，避免 `never/unknown` 阻断。
     */
    type LibraryManagedAttributes<C, P> = C extends string
      ? P
      : C extends VirtualNodeType
        ? ElementProps<C> & ComponentModelBindingProps
        : P

    /** 标记 `children` 对应的 `props` 键名，供 TS 推导使用。 */
    interface ElementChildrenAttribute {
      /** 用于指示 `children` 在 props 中的字段名。 */
      children: unknown
    }

    /** `JSX` 内置属性，当前仅支持 `key`。 */
    interface IntrinsicAttributes {
      /** Diff 使用的稳定标识。 */
      key?: PropertyKey
      /** 透传宿主元素引用的 ref。 */
      ref?: ElementRef
    }

    /**
     * 基于 DOM lib 为内置标签提供更精确的属性提示，
     * 同时保留字符串索引以兼容自定义属性。
     */
    type IntrinsicElements = HtmlIntrinsicElements & SvgIntrinsicElements
  }
}

export {}
