/**
 * 暴露核心响应式与 JSX 运行时能力，供外部统一引入。
 */
export type { ElementType, SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'
export { Fragment } from '@/jsx-foundation/index.ts'
export { h, jsx, jsxDEV, jsxs } from '@/jsx-runtime/index.ts'
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
  toRaw,
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
  Router,
  RouterConfig,
  RouteRecord,
  RouterLinkProps,
  RouterViewProps,
} from '@/router/index.ts'
export { inject, provide } from '@/runtime-core/index.ts'
export type { DomAppInstance, ElementRef } from '@/runtime-dom/index.ts'
export { createApp, render } from '@/runtime-dom/index.ts'
export type {
  ErrorContext,
  ErrorHandler,
  ErrorMeta,
  ErrorPayload,
  ErrorToken,
  InjectionKey,
  InjectionToken,
  PropsShape,
} from '@/shared/index.ts'
export { setErrorHandler } from '@/shared/index.ts'
