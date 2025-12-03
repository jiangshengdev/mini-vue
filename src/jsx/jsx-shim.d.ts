import type { ElementType as MiniElementType, VirtualNode } from '@/jsx/virtual-node/index.ts'
import type { ElementRef } from '@/runtime-dom/index.ts'
import type { PropsShape } from '@/shared/types.ts'

/**
 * 为 TypeScript 提供 mini-vue JSX 环境下的类型声明。
 */
declare global {
  namespace JSX {
    /** 单个 JSX 表达式最终对应的虚拟节点类型。 */
    type Element = VirtualNode

    /** JSX 标签名可以是原生标签、组件或 Fragment。 */
    type ElementType = MiniElementType

    /** 标记 children 对应的 props 键名，供 TS 推导使用。 */
    interface ElementChildrenAttribute {
      children: unknown
    }

    /** JSX 内置属性，当前仅支持 key。 */
    interface IntrinsicAttributes {
      key?: PropertyKey
      ref?: ElementRef
    }

    /**
     * 内置标签（如 div、span）的属性约束，
     * 这里统一允许任意键值对，具体由运行时处理。
     */
    type IntrinsicElements = Record<string, PropsShape>
  }
}

export {}
