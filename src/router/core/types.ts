import type { SetupComponent } from '@/jsx-foundation/index.ts'
import type { Ref } from '@/reactivity/index.ts'
import type { PluginCleanup, PluginInstallApp, PluginObject } from '@/shared/index.ts'

/**
 * 路由记录：定义原始路径与对应组件的绑定关系。
 *
 * @remarks
 * - 作为 `RouterConfig.routes` 数组的元素类型。
 * - 路径会在路由器初始化时归一化处理。
 *
 * @beta
 */
export interface RouteRecord {
  /**
   * 需要匹配的路径。
   *
   * @remarks
   * - 约定使用前导斜杠形式（如 `/about`）。
   * - 路由器会自动归一化处理（补前导斜杠、去尾随斜杠等）。
   */
  path: string
  /**
   * 命中该路径时渲染的组件定义。
   *
   * @remarks
   * - 必须是 `SetupComponent` 类型，即返回渲染函数的组件。
   */
  component: SetupComponent
}

/**
 * 标准化后的路由定位信息，供渲染层消费。
 *
 * @remarks
 * - 由 `matchRoute` 内部函数生成，存储在 `router.currentRoute` 中。
 * - `matched` 数组为嵌套 `RouterView` 提供按深度索引的组件列表。
 *
 * @beta
 */
export interface RouteLocation {
  /**
   * 归一化后的路径值。
   *
   * @remarks
   * - 已去除 query/hash，补齐前导斜杠，移除尾随斜杠。
   */
  path: string
  /**
   * 携带 query/hash 的完整路径。
   *
   * @remarks
   * - 以归一化后的路径为基准拼接 query/hash。
   */
  fullPath: string
  /**
   * 查询字符串，包含 `?` 前缀。
   */
  query: string
  /**
   * Hash 片段，包含 `#` 前缀。
   */
  hash: string
  /**
   * 当前路径对应的组件。
   *
   * @remarks
   * - 未命中任何路由记录时为 `fallback` 组件。
   */
  component: SetupComponent
  /**
   * 当前路径命中的组件链路。
   *
   * @remarks
   * - 数组索引对应 `RouterView` 的嵌套深度。
   * - 当前实现仅支持单层路由，数组长度固定为 1。
   * - 为未来嵌套路由扩展预留。
   */
  matched: SetupComponent[]
}

/**
 * 创建路由器的配置输入。
 *
 * @remarks
 * - 传入 `createRouter` 函数以初始化路由器实例。
 * - 路由匹配采用精确匹配策略，按 `routes` 数组顺序无关。
 *
 * @beta
 */
export interface RouterConfig {
  /**
   * 可供匹配的路由记录列表。
   *
   * @remarks
   * - 路径会在初始化时归一化并建立映射表。
   * - 相同路径的后续记录会覆盖前面的记录。
   */
  routes: RouteRecord[]
  /**
   * 未命中任何记录时使用的兜底组件。
   *
   * @remarks
   * - 通常用于渲染 404 页面。
   * - 必须提供，不支持空兜底。
   */
  fallback: SetupComponent
}

/**
 * 路由器公开 API，暴露当前路由状态与导航控制。
 *
 * @remarks
 * - 支持作为插件安装到 `app`，对齐 `vue-router` 的使用方式。
 * - 自动管理 `popstate` 事件监听的生命周期。
 *
 * @beta
 */
export interface Router extends PluginObject<PluginInstallApp> {
  /**
   * 当前路由定位的响应式引用。
   *
   * @remarks
   * - 供外部订阅以触发视图更新。
   * - 导航或浏览器前进/后退时自动更新。
   */
  currentRoute: Ref<RouteLocation>
  /**
   * 主动跳转到指定路径。
   *
   * @remarks
   * - 写入 `history` 并更新 `currentRoute`。
   * - 路径中的 query/hash 会保留在 URL 中。
   */
  navigate: (path: string) => void
  /**
   * 开始监听浏览器前进/后退事件。
   *
   * @remarks
   * - 绑定 `popstate` 事件处理器。
   * - 通常由 `install` 自动调用，无需手动调用。
   */
  start: () => void
  /**
   * 停止监听浏览器前进/后退事件。
   *
   * @remarks
   * - 移除 `popstate` 事件绑定。
   * - 通常在所有 `app` 卸载后自动调用。
   */
  stop: () => void
  /**
   * 作为应用插件安装到 `app` 上。
   *
   * @remarks
   * - 将 `router` 注入到组件树中，供 `useRouter` 等 API 读取。
   * - 首次安装时自动调用 `start`，最后一个 `app` 卸载时自动 `stop`。
   * - 同一个 `app` 不能安装多个不同的 `router`。
   */
  install: (app: PluginInstallApp) => void
  /** 卸载插件时的清理钩子，用于回收安装计数和停止监听。 */
  cleanup?: PluginCleanup<PluginInstallApp>
}
