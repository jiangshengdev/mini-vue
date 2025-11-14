import type { ElementType as MiniElementType, VNode } from './vnode/index.ts'

declare global {
  namespace JSX {
    type Element = VNode
    type ElementType = MiniElementType
    interface ElementClass {
      __miniVueComponentBrand?: true
    }
    interface ElementChildrenAttribute {
      children: { value?: unknown }
    }
    interface IntrinsicAttributes {
      key?: string | number
    }
    interface IntrinsicElements {
      [name: string]: Record<string, unknown>
    }
    interface JSXElementConstructor<P> {
      (props: P, context?: unknown): Element | null
      new (props: P, context?: unknown): Element
    }
  }
}

export {}
