/**
 * JSX 运行时的 `v-model` 转换聚合入口，统一导出组件写回与读取工具。
 *
 * 仅覆盖组件 `v-model` 协议；表单元素的 `v-model` 由宿主层（如 `runtime-dom`）负责消费。
 */
export { readModelValue, setModelValue, transformModelBindingProps } from './v-model/index.ts'
