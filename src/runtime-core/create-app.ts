import { setCurrentAppContext, unsetCurrentAppContext } from './app-context.ts'
import type { RootRenderFunction } from './renderer.ts'
import type { ElementProps, SetupComponent } from '@/jsx-foundation/index.ts'
import { buildVirtualNode } from '@/jsx-runtime/index.ts'
import {
  runtimeCoreAppAlreadyMounted,
  runtimeCoreDuplicatePluginName,
  runtimeCoreInvalidPlugin,
} from '@/messages/index.ts'
import type {
  InjectionKey,
  InjectionToken,
  PlainObject,
  PluginInstallApp,
  PluginObject,
  PropsShape,
} from '@/shared/index.ts'
import { errorContexts, errorPhases, runThrowing } from '@/shared/index.ts'

/** 应用生命周期状态常量，区分是否已挂载。 */
const appLifecycleStatus = {
  /** 尚未执行 `mount`，应用处于空闲等待状态。 */
  idle: 'idle',
  /** 根节点已挂载在容器上，需先 `unmount` 才能重复挂载。 */
  mounted: 'mounted',
} as const

type AppLifecycleStatus = (typeof appLifecycleStatus)[keyof typeof appLifecycleStatus]

/**
 * 宿主平台注入的渲染配置，提供渲染与清理能力。
 *
 * @remarks
 * 由宿主平台（如 `runtime-dom`）实现，`createApp` 通过它完成平台无关的应用生命周期管理。
 */
export interface AppHostDriver<HostElement extends WeakKey> {
  /** 将根子树挂载到目标容器的渲染函数。 */
  render: RootRenderFunction<HostElement>
  /** 卸载宿主容器中的子树，释放响应式副作用。 */
  unmount: (container: HostElement) => void
}

/**
 * 最小的应用级上下文，用于插件与 `provide`/`inject` 的根级 `provides`。
 *
 * @remarks
 * - `provides` 会在根组件实例创建时注入到组件树的 `provides` 原型链上。
 * - 通过 `app.provide()` 写入的值会存储在这里。
 */
export interface AppContext {
  /** 应用级依赖注入容器（root `provides`），供整棵组件树通过原型链继承读取。 */
  provides: PlainObject
}

/**
 * 应用插件：支持对象形式（带 `install` 方法）。
 */
export type AppPlugin = PluginObject<PluginInstallApp>

/**
 * `createApp` 返回的实例 API，封装 `mount`/`unmount` 生命周期。
 *
 * @remarks
 * - `mount`：指定宿主容器并触发首次渲染，只能调用一次。
 * - `unmount`：停止渲染并释放容器内容，之后可重新 `mount`。
 * - `use`：安装对象形式的插件。
 * - `provide`：在应用级提供依赖，供整个组件树通过 `inject()` 读取。
 */
export interface AppInstance<HostElement> extends PluginInstallApp {
  /** 指定宿主容器并触发首次渲染。 */
  mount(target: HostElement): void
  /** 停止渲染并释放容器内容。 */
  unmount(): void
  /** 安装对象插件。 */
  use(plugin: AppPlugin): void
  /**
   * 在应用级提供依赖，供整个组件树通过 `inject()` 读取。
   *
   * @remarks
   * - 这是「组件外」的依赖注入入口，适用于插件安装、路由安装等场景。
   * - 组件 `setup()` 内请使用 `provide()`/`inject()`，不要在组件外直接调用它们。
   */
  provide<T>(key: InjectionKey<T>, value: T): void
  provide(key: InjectionToken, value: unknown): void
}

/**
 * 应用内部状态记录，追踪当前容器与根组件信息。
 */
interface AppState<HostElement extends WeakKey> {
  /** 标识应用当前是否已挂载。 */
  status: AppLifecycleStatus
  /** 最近一次挂载的宿主容器引用。 */
  container: HostElement | undefined
  /** 宿主注入的渲染配置。 */
  config: AppHostDriver<HostElement>
  /** 根组件定义，用于生成顶层子树。 */
  rootComponent: SetupComponent
  /** 传入根组件的初始 `props`。 */
  initialRootProps?: PropsShape
  /** 应用级上下文。 */
  appContext: AppContext
}

/**
 * 按当前状态执行一次挂载，负责生成子树并调度渲染。
 *
 * @remarks
 * - 已挂载时直接阻止重复操作，避免宿主状态错乱。
 * - 渲染成功后再缓存容器和状态，避免失败时留下残留。
 */
function mountApp<HostElement extends WeakKey>(
  state: AppState<HostElement>,
  target: HostElement,
): void {
  /* 已挂载时直接阻止重复操作，避免宿主状态错乱。 */
  if (state.status === appLifecycleStatus.mounted) {
    throw new Error(runtimeCoreAppAlreadyMounted, { cause: state.container })
  }

  /* 运行根组件获取最新子树，确保 `props` 变更生效。 */
  const rootNode = createRootVirtualNode(state)

  /* 交由渲染器负责真正的 DOM 挂载，并让组件 `effect` 托管更新。 */
  setCurrentAppContext(state.appContext)
  let renderSucceeded = false

  try {
    state.config.render(rootNode, target)
    renderSucceeded = true
  } finally {
    unsetCurrentAppContext()
  }

  /* 渲染成功后再缓存容器和状态，避免失败时留下「`idle` + `container`」的残留。 */
  if (renderSucceeded) {
    state.container = target
    state.status = appLifecycleStatus.mounted
  }
}

/**
 * 清理当前应用实例，释放宿主容器与内部状态。
 *
 * @remarks
 * - 没有容器代表尚未挂载，直接跳过。
 * - 调用宿主清理逻辑并重置状态，便于后续重新挂载。
 */
function unmountApp<HostElement extends WeakKey>(state: AppState<HostElement>): void {
  /* 没有容器代表尚未挂载，直接跳过。 */
  if (!state.container) {
    return
  }

  /* 调用宿主清理逻辑并重置状态，便于后续重新挂载。 */
  state.config.unmount(state.container)
  state.status = appLifecycleStatus.idle
  state.container = undefined
}

/**
 * 通过最新状态生成根级 `virtualNode`，确保 `props` 是独立副本。
 */
function createRootVirtualNode<HostElement extends WeakKey>(state: AppState<HostElement>) {
  const rawProps: ElementProps<SetupComponent> | undefined = state.initialRootProps
    ? { ...state.initialRootProps }
    : undefined

  const node = buildVirtualNode(state.rootComponent, rawProps)

  ;(node as { appContext?: AppContext }).appContext = state.appContext

  return node
}

/**
 * 创建应用实例，封装 `mount`/`unmount` 生命周期与状态管理。
 *
 * @remarks
 * - 应用实例是 mini-vue 的顶层入口，负责管理根组件的挂载与卸载。
 * - 通过 `app.provide()` 可在应用级提供依赖，供整个组件树通过 `inject()` 读取。
 * - 通过 `app.use()` 可安装插件，扩展应用能力。
 */
export function createAppInstance<HostElement extends WeakKey>(
  config: AppHostDriver<HostElement>,
  rootComponent: SetupComponent,
  initialRootProps?: PropsShape,
): AppInstance<HostElement> {
  const state: AppState<HostElement> = {
    status: appLifecycleStatus.idle,
    container: undefined,
    config,
    rootComponent,
    initialRootProps,
    appContext: { provides: Object.create(null) as PlainObject },
  }

  /** 已安装插件名，避免重复安装（有名插件按 name 去重）。 */
  const installedPluginNames = new Set<string>()
  /** 插件清理回调栈，按安装顺序压栈，卸载时后进先出执行。 */
  const pluginUninstallStack: Array<() => void> = []

  const registerUninstall = (uninstall: unknown): void => {
    if (typeof uninstall === 'function') {
      pluginUninstallStack.push(uninstall as () => void)
    }
  }

  const runPluginUninstalls = (): void => {
    while (pluginUninstallStack.length > 0) {
      const uninstall = pluginUninstallStack.pop()

      if (!uninstall) {
        continue
      }

      runThrowing(uninstall, {
        origin: errorContexts.appPluginUse,
        handlerPhase: errorPhases.sync,
      })
    }

    installedPluginNames.clear()
  }

  const resolvePluginUninstall = (
    plugin: AppPlugin,
    appInstance: AppInstance<HostElement>,
  ): (() => void) => {
    const { uninstall } = plugin

    if (typeof uninstall !== 'function') {
      throw new TypeError(runtimeCoreInvalidPlugin, { cause: plugin })
    }

    return () => {
      uninstall(appInstance)
    }
  }

  /* 用户态 `mount` 会透传容器给核心挂载逻辑。 */
  function mount(target: HostElement): void {
    mountApp(state, target)
  }

  /* `unmount` 暴露为实例方法，便于控制生命周期。 */
  function unmount(): void {
    /* 宿主卸载仅在存在容器时生效，但插件清理始终执行以回收安装期副作用。 */
    unmountApp(state)
    runPluginUninstalls()
  }

  return {
    mount,
    unmount,
    /**
     * 安装应用插件。
     *
     * @remarks
     * - 仅支持对象插件（必须提供 `install(app)` 方法）。
     * - 通过共享错误通道上报，保证行为与其他用户回调入口一致。
     */
    use(plugin: AppPlugin) {
      runThrowing(
        () => {
          if (!plugin || typeof plugin !== 'object') {
            throw new TypeError(runtimeCoreInvalidPlugin, { cause: plugin })
          }

          const pluginName = plugin?.name

          if (typeof pluginName !== 'string') {
            throw new TypeError(runtimeCoreInvalidPlugin, { cause: plugin })
          }

          /* 按 name 去重：同名插件视为重复注册，直接报错。 */
          if (installedPluginNames.has(pluginName)) {
            throw new Error(runtimeCoreDuplicatePluginName, { cause: plugin })
          }

          if (typeof plugin.install !== 'function') {
            throw new TypeError(runtimeCoreInvalidPlugin, { cause: plugin })
          }

          plugin.install(this)

          installedPluginNames.add(pluginName)

          const pluginUninstall = resolvePluginUninstall(plugin, this)

          registerUninstall(pluginUninstall)
        },
        {
          origin: errorContexts.appPluginUse,
          handlerPhase: errorPhases.sync,
        },
      )
    },
    /**
     * 在应用级提供依赖（组件外注入入口）。
     *
     * @remarks
     * - 该值会在根组件实例创建时注入到组件树的 `provides` 原型链上。
     */
    provide(key: InjectionToken, value: unknown) {
      state.appContext.provides[key] = value
    },
  }
}
