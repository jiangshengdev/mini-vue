/** 挂载容器未找到的错误 */
export const runtimeDomContainerNotFound = 'createApp: 未找到可用的挂载容器'

/** 属性值类型不受支持的警告 */
export const runtimeDomUnsupportedAttrValue = (key: string, type: string) => {
  return `[runtime-dom] 属性 "${key}" 收到不受支持的值类型：${type}，已忽略写入`
}
