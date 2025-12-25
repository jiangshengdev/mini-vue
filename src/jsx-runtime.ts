/**
 * JSX 生产态运行时入口。
 *
 * 本模块为 JSX 编译产物提供 jsx/jsxs 等运行时入口的再导出，
 * 对应 tsconfig 中 `jsx: "react-jsx"` 配置。
 *
 * 导出内容：
 * - `Fragment`：片段组件，用于包裹多个子元素
 * - `jsx`/`jsxs`：JSX 元素创建函数
 * - `jsxDEV`：开发态 JSX 元素创建函数（带调试信息）
 * - `h`：手动创建 VirtualNode 的工厂函数
 */
export { Fragment } from '@/jsx-foundation/index.ts'
export { h, jsx, jsxDEV, jsxs } from '@/jsx-runtime/index.ts'
