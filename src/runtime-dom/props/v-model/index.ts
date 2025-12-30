/**
 * DOM 表单 v-model 子模块入口。
 *
 * 仅允许在 `index.ts` 中做聚合导出，保持子模块实现文件职责单一。
 */
export { transformDomModelBindingProps } from './transform.ts'
