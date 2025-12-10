/**
 * 暴露核心响应式与 JSX 运行时能力，供外部统一引入。
 */
export type { ElementRef, DomAppInstance } from '@/runtime-dom/index.ts'
export {
  computed,
  effect,
  effectScope,
  getCurrentScope,
  isReactive,
  isRef,
  onScopeDispose,
  reactive,
  ref,
  toRef,
  unref,
  watch,
} from '@/reactivity/index.ts'
export type {
  ComputedGetter,
  ComputedSetter,
  EffectScope,
  Ref,
  WatchCallback,
  WatchOptions,
  WatchSource,
  WatchStopHandle,
  WritableComputedOptions,
} from '@/reactivity/index.ts'
export { createApp, render } from '@/runtime-dom/index.ts'
export type { SetupComponent, ElementType, VirtualNode } from '@/jsx-foundation/index.ts'
export { Fragment } from '@/jsx-foundation/index.ts'
export { h, jsx, jsxs, jsxDEV } from '@/jsx-runtime/index.ts'
export type { PropsShape } from '@/shared/types.ts'
export type { ErrorContext } from '@/shared/error-channel.ts'
export type { ErrorHandler } from '@/shared/error-handling.ts'
export { setErrorHandler } from '@/shared/error-handling.ts'
