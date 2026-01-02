/**
 * JSX 生产态运行时入口，面向 `jsx: "react-jsx"` 编译产物提供 `jsx`/`jsxs`、`h` 与 `Fragment` 的再导出。
 *
 * 仅承担符号聚合与转出，不包含开发态调试信息，虚拟节点创建逻辑由 `jsx-runtime` 子模块实现。
 */
export { Fragment } from '@/jsx-foundation/index.ts'
export { h, jsx, jsxDEV, jsxs } from '@/jsx-runtime/index.ts'
