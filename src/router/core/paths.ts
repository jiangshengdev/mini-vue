/** 匹配路径末尾的一个或多个斜杠，用于归一化时移除尾随斜杠。 */
const trailingSlashRe = /\/+$/

/**
 * 移除路径中的 `query`（`?` 起始）与 `hash`（`#` 起始）片段，仅保留纯路径部分。
 *
 * @remarks
 * - 同时存在 `?` 和 `#` 时，取两者中较前的位置作为截断点。
 * - 若路径中不含 `?` 或 `#`，则原样返回。
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
 * 提取路径中的 `query`（`?` 起始）与 `hash`（`#` 起始）片段。
 *
 * @remarks
 * - 若路径中不含 `?` 或 `#`，则返回空字符串。
 * - 返回值包含 `?` 或 `#` 前缀本身，可直接拼接到归一化路径后。
 */
export function getQueryAndHash(path: string): string {
  const pathname = stripQueryAndHash(path)

  return path.slice(pathname.length)
}

/**
 * 规范化路由路径：去除 `query/hash`，补前导斜杠，移除尾随斜杠。
 *
 * @remarks
 * - 空路径或仅含空白字符时返回根路径 `/`。
 * - 路径不以 `/` 开头时自动补齐。
 * - 路径末尾的连续斜杠会被移除（根路径 `/` 除外）。
 */
export function normalizePath(path: string): string {
  if (!path) {
    return '/'
  }

  let normalized = stripQueryAndHash(path)

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`
  }

  if (normalized.length > 1 && trailingSlashRe.test(normalized)) {
    normalized = normalized.replace(trailingSlashRe, '')
  }

  return normalized || '/'
}
