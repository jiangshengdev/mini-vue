import type { RootRenderFunction } from './renderer.ts'
import { setCurrentAppContext, unsetCurrentAppContext } from './app-context.ts'
import type { InjectionKey, InjectionToken } from '@/shared'
import type { ElementProps, SetupComponent } from '@/jsx-foundation/index.ts'
import { createVirtualNode } from '@/jsx-foundation/index.ts'
import type { PluginInstallApp } from '@/shared/plugin.ts'
import type { PlainObject, PropsShape } from '@/shared/index.ts'
import { errorContexts, errorPhases, runThrowing } from '@/shared/index.ts'

/** 应用生命周期状态常量，区分是否已挂载。 */
const appLifecycleStatus = {
  /** 尚未执行 mount，应用处于空闲等待状态。 */
  idle: 'idle',
  /** 根节点已挂载在容器上，需先 unmount 才能重复挂载。 */
  mounted: 'mounted',
} as const

type AppLifecycleStatus = (typeof appLifecycleStatus)[keyof typeof appLifecycleStatus]

/**
 * 宿主平台注入的渲染配置，提供渲染与清理能力。
 */
export interface AppRuntimeConfig<HostElement> {
  /** 将根子树挂载到目标容器的渲染函数。 */
  render: RootRenderFunction<HostElement>
  /** 卸载宿主容器中的子树，释放响应式副作用。 */
  unmount: (container: HostElement) => void
}

/** 最小的应用级上下文，用于插件与 provide/inject 的根级 provides */
export interface AppContext {
  /** 应用级依赖注入容器（root provides），供整棵组件树通过原型链继承读取。 */
  provides: PlainObject
}

/** 应用插件：仅支持函数形式，保持 API 收敛。 */
export type AppPlugin<HostElement> =
  | ((app: AppInstance<HostElement>) => void)
  | { install: (app: AppInstance<HostElement>) => void }

/**
 * `createApp` 返回的实例 API，封装 `mount`/`unmount` 生命周期。
 */
export interface AppInstance<HostElement> extends PluginInstallApp {
  /** 指定宿主容器并触发首次渲染。 */
  mount(target: HostElement): void
  /** 停止渲染并释放容器内容。 */
  unmount(): void
  /** 安装插件（函数或对象带 install）。 */
  use(plugin: AppPlugin<HostElement>): void
  /**
   * 在应用级提供依赖，供整个组件树通过 `inject()` 读取。
   *
   * @remarks
   * - 这是“组件外”的依赖注入入口，适用于插件安装、路由安装等场景。
   * - 组件 `setup()` 内请使用 `provide()`/`inject()`，不要在组件外直接调用它们。
   */
  provide<T>(key: InjectionKey<T>, value: T): void
  provide(key: InjectionToken, value: unknown): void
}

/**
 * 应用内部状态记录，追踪当前容器与根组件信息。
 */
interface AppState<HostElement> {
  /** 标识应用当前是否已挂载。 */
  status: AppLifecycleStatus
  /** 最近一次挂载的宿主容器引用。 */
  container: HostElement | undefined
  /** 宿主注入的渲染配置。 */
  config: AppRuntimeConfig<HostElement>
  /** 根组件定义，用于生成顶层子树。 */
  rootComponent: SetupComponent
  /** 传入根组件的初始 props。 */
  initialRootProps?: PropsShape
  /** 应用级上下文 */
  appContext: AppContext
}

/**
 * 按当前状态执行一次挂载，负责生成子树并调度渲染。
 */
function mountApp<HostElement>(state: AppState<HostElement>, target: HostElement): void {
  /* 已挂载时直接阻止重复操作，避免宿主状态错乱。 */
  if (state.status === appLifecycleStatus.mounted) {
    throw new Error('createApp: 当前应用已挂载，不能重复执行 mount', { cause: state.container })
  }

  /* 缓存容器以便后续执行 unmount。 */
  state.container = target

  /* 运行根组件获取最新子树，确保 props 变更生效。 */
  const rootNode = createRootVirtualNode(state)

  /* 交由渲染器负责真正的 DOM 挂载，并让组件 effect 托管更新。 */
  setCurrentAppContext(state.appContext)

  try {
    state.config.render(rootNode, target)
  } finally {
    unsetCurrentAppContext()
  }

  state.status = appLifecycleStatus.mounted
}

/**
 * 清理当前应用实例，释放宿主容器与内部状态。
 */
function unmountApp<HostElement>(state: AppState<HostElement>): void {
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
 * 通过最新状态生成根级 virtualNode，确保 props 是独立副本。
 */
function createRootVirtualNode<HostElement>(state: AppState<HostElement>) {
  const rawProps: ElementProps<SetupComponent> | undefined = state.initialRootProps
    ? { ...state.initialRootProps }
    : undefined

  const node = createVirtualNode({
    type: state.rootComponent,
    rawProps,
  })

  ;(node as { appContext?: AppContext }).appContext = state.appContext

  return node
}

/**
 * 创建应用实例，封装 mount/unmount 生命周期与状态管理。
 */
export function createAppInstance<HostElement>(
  config: AppRuntimeConfig<HostElement>,
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

  /* 用户态 mount 会透传容器给核心挂载逻辑。 */
  function mount(target: HostElement): void {
    mountApp(state, target)
  }

  /* `unmount` 暴露为实例方法，便于控制生命周期。 */
  function unmount(): void {
    unmountApp(state)
  }

  return {
    mount,
    unmount,
    /**
     * 安装应用插件。
     *
     * @remarks
     * - 统一支持函数插件与 `{ install(app) {} }` 形式。
     * - 通过共享错误通道上报，保证行为与其他用户回调入口一致。
     */
    use(plugin: AppPlugin<HostElement>) {
      runThrowing(
        () => {
          if (typeof plugin === 'function') {
            plugin(this)

            return
          }

          if (plugin && typeof plugin.install === 'function') {
            plugin.install(this)

            return
          }

          throw new TypeError('createApp.use: plugin 必须是函数或带 install(app) 的对象')
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
     * - 该值会在根组件实例创建时注入到组件树的 provides 原型链上。
     */
    provide(key: InjectionToken, value: unknown) {
      state.appContext.provides[key] = value
    },
  }
}
