/** 挂载容器未找到的错误 */
export const runtimeDomContainerNotFound = 'createApp: 未找到可用的挂载容器'

/** style 值类型不合法的警告 */
export const runtimeDomInvalidStyleValue =
  '[runtime-dom] style 仅支持字符串/数字值，已忽略不合法输入：'
/** 属性值类型不受支持的警告 */
export const runtimeDomUnsupportedAttrValue = (key: string, type: string) =>
  `[runtime-dom] 属性 "${key}" 收到不受支持的值类型：${type}，已忽略写入`
