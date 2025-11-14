/**
 * JSX runtime 的统一出口，对齐编译器期望的所有运行时签名。
 */
export { Fragment, h } from './shared.ts'
export { jsx, jsxs, jsxDEV } from './jsx-runtime.ts'
