/**
 * 运行时核心子域消息文案
 *
 * 本模块定义 runtime-core 相关的错误与警告文案，主要覆盖：
 * - 依赖注入：`provide()`/`inject()` 的调用时机约束
 * - 应用生命周期：`createApp` 的挂载状态、插件安装、容器类型
 * - 组件 setup：异步 setup 限制、返回值约束
 * - 渲染警告：不可渲染子节点、缺失宿主节点
 *
 * 命名约定：`runtimeCore` + 功能点 + 语义（如 `runtimeCoreProvideOutsideSetup`）
 */

/**
 * `provide()` 在组件 setup 外调用的错误
 *
 * `provide()` 依赖当前组件实例上下文，必须在 `setup()` 函数内同步调用；
 * 在组件外部或异步回调中调用会抛出此错误。
 */
export const runtimeCoreProvideOutsideSetup = 'provide: 只能在组件 setup 期间调用'

/**
 * `inject()` 在组件 setup 外调用的错误
 *
 * `inject()` 需要从当前组件实例的祖先链中查找 provider；
 * 必须在 `setup()` 函数内同步调用，否则抛出此错误。
 */
export const runtimeCoreInjectOutsideSetup = 'inject: 只能在组件 setup 期间调用'

/**
 * 应用重复挂载的错误
 *
 * `createApp()` 返回的应用实例只能调用一次 `mount()`；
 * 重复挂载会抛出此错误，需先调用 `unmount()` 后才能重新挂载。
 */
export const runtimeCoreAppAlreadyMounted = 'createApp: 当前应用已挂载，不能重复执行 mount'

/**
 * 插件类型错误
 *
 * `app.use(plugin)` 仅接受对象形式的插件，且必须包含 `install(app)` 方法，
 * 其他类型或缺少 install 会抛出此错误。
 */
export const runtimeCoreInvalidPlugin = 'createApp.use: plugin 必须是带 install(app) 的对象'

/**
 * 插件重复安装错误
 *
 * `app.use(plugin)` 不允许注册同名插件，重复调用会抛出此错误。
 */
export const runtimeCoreDuplicatePluginName = 'createApp.use: 已安装同名插件，请勿重复注册'

/**
 * 渲染器容器类型错误
 *
 * `createRenderer` 使用 WeakMap 缓存容器的挂载状态，
 * 因此容器必须是对象类型（包括函数），原始值无法作为 WeakMap 的 key。
 */
export const runtimeCoreInvalidContainer =
  'createRenderer 容器必须是 object（含函数）类型才能缓存挂载状态'

/**
 * 异步 setup 不支持的错误
 *
 * 当前实现不支持异步 `setup()` 函数（返回 Promise）；
 * setup 必须同步返回渲染函数，异步数据获取应在 setup 内部处理。
 */
export const runtimeCoreAsyncSetupNotSupported =
  '暂不支持异步 setup：setup() 必须同步返回渲染函数（不要返回 Promise）'

/**
 * Setup 必须返回渲染函数的错误
 *
 * 组件的 `setup()` 函数必须返回一个渲染函数 `() => VNode`，
 * 用于描述组件的 UI 结构；返回其他类型会抛出此错误。
 */
export const runtimeCoreSetupMustReturnRender = '组件必须返回渲染函数以托管本地状态'

/**
 * 对象类型子节点的警告
 *
 * 渲染器在处理 children 时，会忽略无法渲染的对象类型子节点；
 * 开发态输出此警告帮助定位问题。
 */
export const runtimeCoreObjectChildWarning = '[runtime-core] 检测到无法渲染的子节点，已被忽略：'

/**
 * Patch 阶段缺失宿主节点的调试警告
 *
 * 在 patch 过程中，若 VirtualNode 未记录对应的宿主节点（el/anchor），
 * 则无法进行 DOM 移动或锚点解析；此警告用于调试此类异常情况。
 */
export const runtimeCoreMissingHostNodes =
  '[runtime-core] 当前 virtualNode 未记录宿主节点，无法进行移动或锚点解析：'
