/**
 * 消息文案集中出口，统一对子域错误/警告进行命名与对外导出。
 * 通过单一入口避免各处随意引用子模块路径，便于后续维护与 tree-shaking。
 */
export {
  jsxUnsupportedChildWarning,
  jsxVModelConflictWarning,
  jsxVModelNonFormWarning,
  jsxVModelReadonlyTarget,
} from './jsx.ts'
export {
  reactivityComputedReadonly,
  reactivityScopeDisposeOutside,
  reactivityUnsupportedType,
} from './reactivity.ts'
export { routerDuplicateInstallOnApp, routerNotFound } from './router.ts'
export {
  runtimeCoreAppAlreadyMounted,
  runtimeCoreAsyncSetupNotSupported,
  runtimeCoreInjectOutsideSetup,
  runtimeCoreInvalidContainer,
  runtimeCoreInvalidPlugin,
  runtimeCoreMissingHostNodes,
  runtimeCoreObjectChildWarning,
  runtimeCoreProvideOutsideSetup,
  runtimeCoreSetupMustReturnRender,
} from './runtime-core.ts'
export {
  runtimeDomContainerNotFound,
  runtimeDomInvalidStyleValue,
  runtimeDomUnsupportedAttrValue,
} from './runtime-dom.ts'
export { sharedRunnerNoPromise } from './shared.ts'
