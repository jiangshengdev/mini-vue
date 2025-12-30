/**
 * `v-model` 转换模块的聚合导出入口。
 *
 * 导出内容：
 * - `transformModelBindingProps`：将组件 `v-model` 转换为 `modelValue` 协议
 * - `readModelValue`/`setModelValue`：读写 model 绑定值的工具函数（仅支持 `Ref` 可写目标）
 *
 * @remarks
 * DOM 表单元素的 `v-model` 由宿主层（如 `runtime-dom`）消费，不在本模块中转换。
 */
export { readModelValue, setModelValue, transformModelBindingProps } from './v-model/index.ts'
