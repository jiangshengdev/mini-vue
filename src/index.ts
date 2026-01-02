/**
 * Mini-vue 的聚合入口，集中导出 JSX 运行时、响应式、路由、运行时 DOM、共享工具与插件能力。
 *
 * 该文件只做轻量再导出，不引入额外副作用，保持各子域在自身模块内定义边界与职责。
 */
export { MiniVueDevtoolsPlugin } from '@/devtools/index.ts'
export type { ElementType, SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'
export { Fragment } from '@/jsx-foundation/index.ts'
export { h, jsx, jsxDEV, jsxs } from '@/jsx-runtime/index.ts'
export {
  computed,
  createWatch,
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
  WatchScheduler,
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
export type { KeepAliveProps } from '@/runtime-core/index.ts'
export {
  inject,
  KeepAlive,
  nextTick,
  onActivated,
  onBeforeUpdate,
  onDeactivated,
  onMounted,
  onUnmounted,
  onUpdated,
  provide,
  watch,
} from '@/runtime-core/index.ts'
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
export { registerDevtoolsSetupStateName, setErrorHandler } from '@/shared/index.ts'
export {
  type DiagnosticLevel,
  miniVueCompilerPlugin,
  type MiniVueCompilerPluginOptions,
  miniVueDevtoolsSetupStateNamesPlugin,
  type MiniVueDevtoolsSetupStateNamesPluginOptions,
  type MiniVueTransformPropsDestructureDiagnosticsOptions,
  miniVueTransformPropsDestructurePlugin,
  type MiniVueTransformPropsDestructurePluginOptions,
  miniVueTransformModelBindingWritebackPlugin,
  miniVueTransformModelBindingWritebackPluginName,
  type MiniVueTransformModelBindingWritebackPluginOptions,
} from '@/vite-plugin/index.ts'
