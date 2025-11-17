/**
 * runtime-core 对外入口，聚合平台无关的运行时能力。
 */
export { createRenderer } from './renderer.ts'
export type {
  Renderer,
  RendererOptions,
  RootRenderFunction,
} from './renderer.ts'
export { createAppAPI } from './createApp.ts'
export type { AppInstance } from './createApp.ts'
