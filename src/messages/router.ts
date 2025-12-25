/**
 * 路由子域消息文案
 *
 * 本模块定义路由系统相关的错误文案，主要覆盖：
 * - `useRouter()`：router 实例未找到
 * - `router.install()`：重复安装检测
 *
 * 命名约定：`router` + 功能点 + 语义（如 `routerNotFound`）
 */

/**
 * `useRouter()` 未找到 router 实例的错误
 *
 * 调用 `useRouter()` 时，会从组件上下文或 props 中查找 router 实例；
 * 若未找到，说明应用未正确安装 router 或组件未在 router 上下文内。
 */
export const routerNotFound =
  'useRouter: 未找到 router，请先在 createApp 后调用 app.use(router)，或为 RouterLink/RouterView 显式传入 router props'

/**
 * 同一 app 重复安装 router 的错误
 *
 * 每个 Vue 应用实例只能安装一个 router；
 * 重复调用 `app.use(router)` 会抛出此错误。
 */
export const routerDuplicateInstallOnApp =
  'router.install: 同一 app 仅支持安装一个 router（请移除重复的 app.use(router) 调用）'
