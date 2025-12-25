/**
 * mini-vue 框架主入口。
 *
 * 本模块聚合并导出框架的核心能力，供外部统一引入，包括：
 * - JSX 运行时：`h`、`jsx`、`jsxs`、`jsxDEV`、`Fragment`
 * - 响应式系统：`reactive`、`ref`、`computed`、`effect`、`watch` 等
 * - 路由系统：`createRouter`、`RouterLink`、`RouterView`、`useRouter`
 * - 应用创建：`createApp`、`render`
 * - 依赖注入：`provide`、`inject`
 * - 错误处理：`setErrorHandler`
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
  isReadonly,
  isRef,
  onScopeDispose,
  reactive,
  readonly,
  ref,
  shallowReactive,
  shallowReadonly,
  state,
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
  State,
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
