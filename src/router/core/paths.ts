const trailingSlashRe = /\/+$/

/**
 * 移除路径中的 `query` 与 `hash` 片段，保留纯路径部分。
 */
function stripQueryAndHash(path: string): string {
  const hashIndex = path.indexOf('#')
  const queryIndex = path.indexOf('?')
  const cutIndex = Math.min(
    hashIndex === -1 ? path.length : hashIndex,
    queryIndex === -1 ? path.length : queryIndex,
  )

  return path.slice(0, cutIndex)
}

/**
 * 提取路径中的 `query` 与 `hash` 片段（若不存在则返回空字符串）。
 */
export function getQueryAndHash(path: string): string {
  const pathname = stripQueryAndHash(path)

  return path.slice(pathname.length)
}

/** 规范化路由路径：去 `query/hash`，补前导斜杠，移除尾随斜杠。 */
export function normalizePath(path: string): string {
  if (!path) return '/'
  let normalized = stripQueryAndHash(path)

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`
  }

  if (normalized.length > 1 && trailingSlashRe.test(normalized)) {
    normalized = normalized.replace(trailingSlashRe, '')
  }

  return normalized || '/'
}
