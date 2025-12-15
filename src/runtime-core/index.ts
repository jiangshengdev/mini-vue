/**
 * `runtime-core` 对外入口，聚合平台无关的运行时能力。
 */
export { getCurrentInstance } from './component/index.ts'
export { createRenderer } from './renderer.ts'
export type { Renderer, RendererOptions, RootRenderFunction } from './renderer.ts'
export { createAppInstance } from './create-app.ts'
export type { AppInstance, AppRuntimeConfig } from './create-app.ts'
export { inject, provide } from './provide-inject.ts'
