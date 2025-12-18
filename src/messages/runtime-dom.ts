/** 挂载容器未找到的错误（`createApp` 未找到对应 DOM 节点）。 */
export const runtimeDomContainerNotFound = 'createApp: 未找到可用的挂载容器'

/**
 * `style` 值类型不合法的警告，提示当前 `key` 收到的类型不受支持。
 *
 * @param key - 被写入的 `style` 属性名
 * @param type - 实际传入值的类型描述
 */
export const runtimeDomInvalidStyleValue = (key: string, type: string) => {
  return `[runtime-dom] style "${key}" 仅支持字符串/数字值，收到 ${type}，已忽略写入`
}

/**
 * 属性值类型不受支持的警告，明确具体属性名与收到的类型。
 *
 * @param key - 被设置的属性名
 * @param type - 属性值的类型描述
 */
export const runtimeDomUnsupportedAttrValue = (key: string, type: string) => {
  return `[runtime-dom] 属性 "${key}" 收到不受支持的值类型：${type}，已忽略写入`
}
