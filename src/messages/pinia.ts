/**
 * Pinia 子域错误文案。
 */

/**
 * `useStore()` 时未找到 pinia 注入。
 */
export const piniaNotInstalled =
  'pinia: 未找到 pinia，请先在 createApp 后调用 app.use(createPinia())'

/**
 * 同一 store id 被不同定义重复注册。
 */
export const piniaDefineStoreDuplicateId =
  'pinia.defineStore: 已存在同 id 的不同 store 定义，请修改 id 或移除重复定义'

/**
 * Setup store 必须返回对象。
 */
export const piniaSetupMustReturnObject = 'pinia.defineStore: setup 必须返回对象'
