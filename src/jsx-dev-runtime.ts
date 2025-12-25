/**
 * JSX 开发态运行时入口。
 *
 * 本模块为 JSX 编译产物提供 jsx/jsxs/jsxDEV 等开发态入口的再导出，
 * 对应 tsconfig 中 `jsx: "react-jsxdev"` 配置。
 *
 * 与生产态入口的区别：
 * - 开发态会使用 `jsxDEV` 函数，携带额外的调试信息（如源码位置）
 * - 生产态使用 `jsx`/`jsxs` 函数，不携带调试信息以减小体积
 *
 * 导出内容：
 * - `Fragment`：片段组件，用于包裹多个子元素
 * - `jsx`/`jsxs`：JSX 元素创建函数
 * - `jsxDEV`：开发态 JSX 元素创建函数（带调试信息）
 * - `h`：手动创建 VirtualNode 的工厂函数
 */
export { Fragment } from '@/jsx-foundation/index.ts'
export { h, jsx, jsxDEV, jsxs } from '@/jsx-runtime/index.ts'
