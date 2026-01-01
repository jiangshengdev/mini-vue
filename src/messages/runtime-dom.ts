/**
 * 运行时 DOM 子域消息文案
 *
 * 本模块定义 runtime-dom（DOM 宿主实现）相关的错误与警告文案，主要覆盖：
 * - 挂载容器：`createApp` 的容器查找失败
 * - 属性处理：style 值类型、通用属性值类型的校验警告
 *
 * 命名约定：`runtimeDom` + 功能点 + 语义（如 `runtimeDomContainerNotFound`）
 */

/**
 * 挂载容器未找到的错误
 *
 * `createApp().mount(selector)` 会通过选择器查找 DOM 容器；
 * 若未找到匹配的元素，抛出此错误。
 */
export const runtimeDomContainerNotFound = 'createApp: 未找到可用的挂载容器'

/**
 * DOM 不可用的错误
 *
 * SSR/Node 等无 DOM 环境下，如果用户尝试使用字符串选择器挂载，会触发该错误。
 */
export const runtimeDomDocumentUnavailable =
  'createApp: 当前环境不存在 document，无法使用选择器挂载'

/**
 * Style 值类型不合法的警告
 *
 * 内联 style 的属性值仅支持字符串或数字类型；
 * 传入对象、数组等其他类型时，输出此警告并忽略写入。
 *
 * @param key - 被写入的 style 属性名（如 `color`、`fontSize`）
 * @param type - 实际传入值的类型描述（如 `object`、`function`）
 */
export const runtimeDomInvalidStyleValue = (key: string, type: string) => {
  return `[runtime-dom] style "${key}" 仅支持字符串/数字值，收到 ${type}，已忽略写入`
}

/**
 * 属性值类型不受支持的警告
 *
 * DOM 属性值通常应为字符串、数字或布尔值；
 * 传入函数、Symbol 等不支持的类型时，输出此警告并忽略写入。
 *
 * @param key - 被设置的属性名
 * @param type - 属性值的类型描述
 */
export const runtimeDomUnsupportedAttrValue = (key: string, type: string) => {
  return `[runtime-dom] 属性 "${key}" 收到不受支持的值类型：${type}，已忽略写入`
}
