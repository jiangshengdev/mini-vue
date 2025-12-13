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
  EffectHandle,
  EffectOptions,
  EffectScheduler,
  EffectScope,
  Ref,
  WatchCallback,
  WatchOptions,
  WatchSource,
  WatchStopHandle,
  WritableComputedOptions,
} from '@/reactivity/index.ts'
export { createRouter, RouterLink, RouterView, useRouter } from '@/router/index.ts'
export type {
  RouteLocation,
  RouteRecord,
  Router,
  RouterConfig,
  RouterLinkProps,
  RouterViewProps,
} from '@/router/index.ts'
export { createApp, render } from '@/runtime-dom/index.ts'
export { inject, provide } from '@/runtime-core/index.ts'
export type { InjectionKey, InjectionToken } from '@/runtime-core/index.ts'
export type { SetupComponent, ElementType, VirtualNode } from '@/jsx-foundation/index.ts'
export { Fragment } from '@/jsx-foundation/index.ts'
export { h, jsx, jsxs, jsxDEV } from '@/jsx-runtime/index.ts'
export type {
  ErrorContext,
  ErrorHandler,
  ErrorMeta,
  ErrorPayload,
  ErrorToken,
  PropsShape,
} from '@/shared/index.ts'
export { setErrorHandler } from '@/shared/index.ts'
