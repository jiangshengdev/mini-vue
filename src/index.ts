/**
 * 暴露核心响应式与 JSX 运行时能力，供外部统一引入。
 */
export type { ElementRef } from '@/runtime-dom/index.ts'
export {
  reactive,
  isReactive,
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
} from '@/reactivity/index.ts'
export type { Ref } from '@/reactivity/index.ts'
export type {
  ComputedGetter,
  ComputedSetter,
  WritableComputedOptions,
  EffectScope,
  WatchSource,
  WatchCallback,
  WatchOptions,
  WatchStopHandle,
} from '@/reactivity/index.ts'
export { createApp, render } from '@/runtime-dom/index.ts'
export type { DomAppInstance } from '@/runtime-dom/index.ts'
export type { SetupComponent, ElementType, VirtualNode } from '@/jsx-foundation/index.ts'
export { Fragment } from '@/jsx-foundation/index.ts'
export { h, jsx, jsxs, jsxDEV } from '@/jsx-runtime/index.ts'
export type { PropsShape } from '@/shared/types.ts'
export type { ErrorContext } from '@/shared/error-channel.ts'
export type { ErrorHandler } from '@/shared/error-handling.ts'
export { setErrorHandler } from '@/shared/error-handling.ts'
