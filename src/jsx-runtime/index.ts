/**
 * `jsx-runtime` 的聚合出口，统一暴露编译器与用户侧的 JSX 调用入口。
 * `jsx/jsxs/jsxDEV` 供编译器在 `react-jsx` 模式下自动插入；`h` 供运行时手写 VirtualNode。
 * 入口函数最终都委托 `buildVirtualNode`，区别仅在调用方与 `children` 的传递方式。
 */
export { buildVirtualNode, h } from './builder.ts'
export { jsx, jsxDEV, jsxs } from './runtime.ts'
