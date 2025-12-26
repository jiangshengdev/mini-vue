/**
 * `jsx-runtime` 模块的聚合导出入口。
 *
 * 本模块向外暴露两类 JSX 运行时函数：
 * - `jsx/jsxs/jsxDEV`：供 TypeScript/Babel 编译器在 `jsx: "react-jsx"` 模式下自动调用
 * - `h`：供用户在运行时手动构建 VirtualNode（支持可变 children 参数）
 *
 * 两类函数最终都通过 `buildVirtualNode` 创建 VirtualNode，区别在于调用方式与参数形态。
 */
export { buildVirtualNode, h } from './builder.ts'
export { jsx, jsxDEV, jsxs } from './runtime.ts'
