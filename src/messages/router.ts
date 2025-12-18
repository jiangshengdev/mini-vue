/** `useRouter` 未找到 `router` 的错误 */
export const routerNotFound =
  'useRouter: 未找到 router，请先在 createApp 后调用 app.use(router)，或为 RouterLink/RouterView 显式传入 router props'

/** 同一 `app` 重复安装 `router` 的错误 */
export const routerDuplicateInstallOnApp =
  'router.install: 同一 app 仅支持安装一个 router（请移除重复的 app.use(router) 调用）'
