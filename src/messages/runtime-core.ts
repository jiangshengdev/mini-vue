/** `provide()` 在组件外调用的错误 */
export const runtimeCoreProvideOutsideSetup = 'provide: 只能在组件 setup 期间调用'

/** `inject()` 在组件外调用的错误 */
export const runtimeCoreInjectOutsideSetup = 'inject: 只能在组件 setup 期间调用'

/** 应用重复挂载的错误（`createApp` 的 `mount` 生命周期约束） */
export const runtimeCoreAppAlreadyMounted = 'createApp: 当前应用已挂载，不能重复执行 mount'

/** 插件类型错误（`app.use(plugin)` 仅接受函数或带 `install(app)` 的对象） */
export const runtimeCoreInvalidPlugin = 'createApp.use: plugin 必须是函数或带 install(app) 的对象'

/** 渲染器容器类型错误（`createRenderer` 需要可作为 `WeakMap` key 的对象/函数） */
export const runtimeCoreInvalidContainer =
  'createRenderer 容器必须是 object（含函数）类型才能缓存挂载状态'

/** 异步 `setup` 不支持的错误 */
export const runtimeCoreAsyncSetupNotSupported =
  '暂不支持异步 setup：setup() 必须同步返回渲染函数（不要返回 Promise）'

/** `setup` 必须返回渲染函数的错误 */
export const runtimeCoreSetupMustReturnRender = '组件必须返回渲染函数以托管本地状态'

/** 对象类型子节点的警告（无法渲染时会被忽略） */
export const runtimeCoreObjectChildWarning = '[runtime-core] 检测到无法渲染的子节点，已被忽略：'
