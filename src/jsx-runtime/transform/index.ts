/**
 * `v-model` 转换模块的聚合导出入口。
 *
 * 导出内容：
 * - `transformModelBindingProps`：将 `v-model` 转换为受控属性与事件
 * - `readModelValue`/`setModelValue`：读写 model 绑定值的工具函数
 */
export { readModelValue, setModelValue, transformModelBindingProps } from './v-model/index.ts'
