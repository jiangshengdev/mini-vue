import { createVirtualNodeFromJSX } from './shared.ts'
import type { ElementProps, ElementType, VirtualNode } from '@/jsx'

/**
 * 标准 JSX 运行时入口，对应生产环境编译产物中的 jsx 调用。
 */
export function jsx<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  key?: PropertyKey,
): VirtualNode<T> {
  return createVirtualNodeFromJSX(type, props, key)
}

/**
 * 多子节点版本的 jsx，当前实现与 jsx 等价。
 */
export const jsxs = jsx

/**
 * 开发环境使用的 jsx 版本，方便在编译阶段注入额外调试信息。
 * 这里实现上仍然复用 createJSXNode，保持行为一致。
 */
export function jsxDEV<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  key?: PropertyKey,
): VirtualNode<T> {
  return createVirtualNodeFromJSX(type, props, key)
}
