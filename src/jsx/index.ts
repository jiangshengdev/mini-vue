/**
 * JSX 对外入口，逐步聚合运行时 API 与类型（仅向上导出）。
 */
export { createApp } from './createApp.ts'
export { render } from './renderer/index.ts'
export { Fragment } from './vnode/index.ts'
export type { ComponentType } from './vnode/index.ts'
