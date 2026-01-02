/**
 * DOM 表单 `v-model` 子模块入口。
 *
 * 提供 `v-model` 到受控 props 的运行时转换，仅聚合导出子模块。
 * 禁止在入口外新增导出，保持各具体实现文件职责单一。
 */
export { transformDomModelBindingProps } from './transform.ts'
