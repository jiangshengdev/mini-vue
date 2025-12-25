/**
 * `v-model` 转换子模块的聚合导出。
 *
 * 本模块实现了 JSX 中 `v-model` 指令的运行时转换，将声明式的双向绑定
 * 转换为受控组件模式（value + onChange/onInput）。
 */
export { readModelValue, setModelValue } from './model.ts'
export { transformModelBindingProps } from './transform.ts'
