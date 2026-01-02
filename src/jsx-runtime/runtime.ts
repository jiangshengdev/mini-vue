/**
 * JSX 编译器自动调用的运行时入口，承接 `react-jsx` 模式的编译产物。
 * 负责接受编译器合并后的 `props` 与外部传入的 `key`，并交由 VirtualNode 构建器处理。
 * 与手写 `h` 保持分层：`jsx` 系列专属编译器调用，`children` 已内嵌在 `props` 中。
 * 保留 `jsx`/`jsxs`/`jsxDEV` 以兼容生产态与开发态的调用约定。
 */
import { buildVirtualNode } from './builder.ts'
import type { ElementProps, ElementType, VirtualNode } from '@/jsx-foundation/index.ts'

/**
 * 标准 JSX 运行时入口，对应生产环境编译产物中的 `jsx` 调用。
 *
 * 编译器在遇到单子节点或无子节点的 JSX 元素时调用此函数。
 * `key` 作为第三个参数传入，而非包含在 `props` 中。
 *
 * @param type - 元素类型，可以是原生标签名（如 `'div'`）或组件函数
 * @param props - 元素属性，`children` 已由编译器合并到此对象中
 * @param key - 用于 diff 算法的唯一标识，由编译器从 JSX 属性中提取
 * @returns 构建好的 VirtualNode
 *
 * @public
 */
export function jsx<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  key?: PropertyKey,
): VirtualNode<T> {
  return buildVirtualNode(type, props, key)
}

/**
 * 多子节点版本的 `jsx`。
 *
 * 编译器在遇到多子节点的 JSX 元素时调用此函数。
 * 当前实现与 `jsx` 等价，因为 `children` 归一化逻辑统一在 `jsx-foundation` 层处理。
 * 保留独立导出是为了符合 React JSX Runtime 规范，便于未来针对多子节点场景优化。
 *
 * @public
 */
export const jsxs = jsx

/**
 * 开发环境专用的 JSX 运行时入口。
 *
 * 编译器在开发模式下调用此函数，可在编译阶段注入额外调试信息（如源码位置）。
 * 当前实现与 `jsx` 行为一致，预留此接口是为了未来支持开发态增强功能。
 *
 * @param type - 元素类型
 * @param props - 元素属性
 * @param key - 用于 diff 算法的唯一标识
 * @returns 构建好的 VirtualNode
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function jsxDEV<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  key?: PropertyKey,
): VirtualNode<T> {
  return buildVirtualNode(type, props, key)
}
