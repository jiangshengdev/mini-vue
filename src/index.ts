/**
 * 暴露核心响应式与 JSX 运行时能力，供外部统一引入。
 */
export type { ElementRef } from './runtime-dom/index.ts'
export {
  reactive,
  effect,
  watch,
  computed,
  ref,
  isRef,
  unref,
  toRef,
  effectScope,
  getCurrentScope,
  onScopeDispose,
} from './reactivity/index.ts'
export type { Ref } from './reactivity/index.ts'
export type {
  ComputedGetter,
  ComputedSetter,
  WritableComputedOptions,
  EffectScope,
} from './reactivity/index.ts'
export { createApp, render } from './runtime-dom/index.ts'
export type { SetupFunctionComponent } from './jsx/index.ts'
export type { RuntimeErrorContext } from './shared/runtime-error-channel.ts'
export type { RuntimeErrorHandler } from './shared/error-handling.ts'
export { setRuntimeErrorHandler } from './shared/error-handling.ts'
