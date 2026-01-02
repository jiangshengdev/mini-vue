/**
 * JSX 开发态运行时入口，为 `jsx: "react-jsxdev"` 编译产物暴露 `jsx`/`jsxs`/`jsxDEV`、`h` 与 `Fragment` 的再导出。
 *
 * 相比生产态保留 `jsxDEV` 的调试信息，依旧只承担符号聚合，虚拟节点构造由 `jsx-runtime` 子模块处理。
 */
export { Fragment } from '@/jsx-foundation/index.ts'
export { h, jsx, jsxDEV, jsxs } from '@/jsx-runtime/index.ts'
