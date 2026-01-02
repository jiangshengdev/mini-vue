/**
 * Runtime-dom 的入口聚合层，提供绑定 DOM 宿主的应用创建与根级渲染能力。
 *
 * 暴露 DOM 渲染原语、事件 invoker 复用的缓存键以及元素引用类型，供宿主渲染器和 props 模块共享。
 */
export { createApp, renderDomRoot as render } from './create-app.ts'
export type { DomAppInstance } from './create-app.ts'
export { invokerCacheKey } from './props/index.ts'
export type { ElementRef } from './props/index.ts'
export { domRendererOptions } from './renderer-options.ts'
