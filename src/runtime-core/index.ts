/**
 * `runtime-core` 对外入口，聚合平台无关的运行时能力。
 */
export type { ComponentInstance } from './component/index.ts'
export { getCurrentInstance, mountChildWithAnchor, mountComponent } from './component/index.ts'
export type { AppInstance, AppRuntimeConfig } from './create-app.ts'
export { createAppInstance } from './create-app.ts'
export { mountChild } from './mount/index.ts'
export type { NormalizedChildren, NormalizedVirtualNode } from './normalize.ts'
export { normalizeRenderOutput } from './normalize.ts'
export type { PatchEnvironment } from './patch/index.ts'
export { ensureHostNodes, patchChild, patchChildren } from './patch/index.ts'
export { inject, provide } from './provide-inject.ts'
export { createRenderer } from './renderer.ts'
export type { Renderer, RendererOptions, RootRenderFunction } from './renderer.ts'
export { asRuntimeVNode } from './vnode.ts'
