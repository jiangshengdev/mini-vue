/**
 * runtime-dom 模块入口。
 *
 * 本模块为 DOM 宿主环境提供完整的渲染能力，包括：
 * - `createApp`：创建基于 DOM 的应用实例，支持字符串选择器挂载
 * - `render`：根级渲染函数，可直接挂载 JSX 或组件树
 * - `domRendererOptions`：DOM 宿主的渲染原语集合
 * - `invokerCacheKey`：事件处理器缓存键，用于复用 invoker
 * - `ElementRef`：元素引用类型，支持回调函数或响应式 ref
 */
export { createApp, renderDomRoot as render } from './create-app.ts'
export type { DomAppInstance } from './create-app.ts'
export { invokerCacheKey } from './props/index.ts'
export type { ElementRef } from './props/index.ts'
export { domRendererOptions } from './renderer-options.ts'
