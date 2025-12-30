/**
 * `v-model` 转换子模块的聚合导出。
 *
 * 本模块负责「组件 v-model」的运行时转换：将 `'v-model'` 语法糖转换为
 * Vue3 默认组件协议 `modelValue` + `onUpdate:modelValue`。
 *
 * @remarks
 * DOM 表单 `v-model` 由宿主层（如 `runtime-dom`）负责消费，不在本模块中转换。
 */
export { readModelValue, setModelValue } from './model.ts'
export { transformModelBindingProps } from './transform.ts'
