/**
 * 暴露核心响应式与 JSX 运行时能力，供外部统一引入。
 */
export {
  reactive,
  effect,
  ref,
  isRef,
  unref,
  toRef,
} from './reactivity/index.ts'
export type { Ref } from './reactivity/index.ts'
export { createApp, render } from './runtime-dom/index.ts'
export type { ComponentType } from './jsx/index.ts'
