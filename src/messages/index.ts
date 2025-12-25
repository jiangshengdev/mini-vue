/**
 * 消息文案聚合入口
 *
 * 本模块是 `src/messages` 的唯一对外出口，负责将各子域（jsx、reactivity、router、
 * runtime-core、runtime-dom、shared）的错误/警告文案统一导出。
 *
 * 设计意图：
 * - 单一入口：外部模块只需从此处导入，无需关心内部文件组织
 * - 命名隔离：各子域文案以 `子域名 + 语义` 命名（如 `jsxModelBindingConflictWarning`），
 *   避免跨域命名冲突
 * - tree-shaking 友好：具名导出确保未使用的文案可被构建工具剔除
 *
 * 约束：
 * - 新增文案时，先在对应子域文件中定义，再从此处 re-export
 * - 禁止在此文件中直接定义文案内容
 */
export {
  jsxModelBindingConflictWarning,
  jsxModelBindingNonFormWarning,
  jsxModelBindingReadonlyTarget,
  jsxUnsupportedChildWarning,
} from './jsx.ts'
export {
  reactivityComputedReadonly,
  reactivityReadonlyWarning,
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
