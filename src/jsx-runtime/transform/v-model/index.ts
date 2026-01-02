/**
 * 组件 `v-model` 转换子模块的聚合导出，将 JSX `'v-model'` 映射为 Vue3 默认的 `modelValue` 协议。
 *
 * DOM 表单 `v-model` 的适配留给宿主层（如 `runtime-dom`），此处仅处理组件场景。
 */
export { readModelValue, setModelValue } from './model.ts'
export { transformModelBindingProps } from './transform.ts'
