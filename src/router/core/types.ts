import type { Ref } from '@/reactivity/index.ts'
import type { SetupComponent } from '@/jsx-foundation/types.ts'
import type { InjectionKey, InjectionToken } from '@/runtime-core/index.ts'

/**
 * 路由记录：定义原始 path 与对应组件的绑定关系。
 */
export interface RouteRecord {
  /** 需要匹配的路径，约定前导斜杠形式。 */
  path: string
  /** 命中该路径时渲染的组件定义。 */
  component: SetupComponent
}

/**
 * 标准化后的路由定位信息，供渲染消费。
 */
export interface RouteLocation {
  /** 归一化后的路径值。 */
  path: string
  /** 当前路径对应的组件。 */
  component: SetupComponent
}

/**
 * 创建路由器的配置输入。
 */
export interface RouterConfig {
  /** 可供匹配的路由记录列表。 */
  routes: RouteRecord[]
  /** 未命中任何记录时使用的兜底组件。 */
  fallback: SetupComponent
}

/**
 * 路由器公开 API，暴露当前路由状态与导航控制。
 */
export interface Router {
  /** 当前路由定位，供外部订阅渲染。 */
  currentRoute: Ref<RouteLocation>
  /** 主动跳转到指定路径。 */
  navigate: (path: string) => void
  /** 开始监听浏览器前进后退，同步路由状态。 */
  start: () => void
  /** 停止监听，适用于卸载阶段。 */
  stop: () => void
  /** 作为应用插件安装到 app 上（对齐 vue-router 使用方式）。 */
  install: (app: {
    /** 可选卸载钩子：存在时 router 会包装它以在卸载后自动 stop。 */
    unmount?: () => void
    /** 应用级依赖注入入口（泛型重载用于让 routerInjectionKey 具备类型推导）。 */
    provide<T>(key: InjectionKey<T>, value: T): void
    /** 非泛型 token 入口：用于兼容 string key 等场景。 */
    provide(key: InjectionToken, value: unknown): void
  }) => void
}
