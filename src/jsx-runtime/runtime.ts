/**
 * JSX 编译器自动调用的运行时函数。
 *
 * 当 TypeScript/Babel 配置 `jsx: "react-jsx"` 时，编译器会将 JSX 语法转换为对
 * `jsx`/`jsxs`/`jsxDEV` 的调用。这些函数是编译器与运行时之间的契约接口。
 *
 * 与 `h` 函数的区别：
 * - `jsx` 系列由编译器自动调用，`children` 已被编译器合并到 `props` 中
 * - `h` 函数供用户手动调用，支持可变 `children` 参数
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
