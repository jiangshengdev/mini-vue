/**
 * 路径归一化工具集：拆分 query/hash、处理前后缀斜杠。
 */
/** 匹配路径末尾的一个或多个斜杠，用于归一化时移除尾随斜杠。 */
const trailingSlashRe = /\/+$/

/**
 * 移除路径中的 `query`（`?` 起始）与 `hash`（`#` 起始）片段，仅保留纯路径部分。
 *
 * @remarks
 * - 同时存在 `?` 和 `#` 时，取两者中较前的位置作为截断点。
 * - 若路径中不含 `?` 或 `#`，则原样返回。
 *
 * @param path - 待截断的原始路径
 * @returns 不含 query/hash 的路径
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
 *
 * @param path - 含有 query/hash 的原始路径
 * @returns 从 query 起始位置到结尾的子串
 */
export function getQueryAndHash(path: string): string {
  const pathname = stripQueryAndHash(path)

  return path.slice(pathname.length)
}

/**
 * 提取路径中的查询字符串（含 `?`），不含 `hash`。
 *
 * @remarks
 * - 不存在查询参数时返回空字符串。
 * - 若同时存在 `hash`，会在 `#` 处截断。
 *
 * @param path - 含有查询字符串的原始路径
 * @returns 包含 `?` 前缀的查询子串
 */
export function getSearch(path: string): string {
  const queryIndex = path.indexOf('?')

  if (queryIndex === -1) {
    return ''
  }

  const hashIndex = path.indexOf('#')
  const cutIndex = hashIndex === -1 ? path.length : hashIndex

  return path.slice(queryIndex, cutIndex)
}

/**
 * 提取路径中的 `hash` 片段（含 `#` 前缀）。
 *
 * @remarks
 * - 不存在 hash 时返回空字符串。
 *
 * @param path - 可能包含 hash 的原始路径
 * @returns 包含 `#` 的 hash 子串
 */
export function getHash(path: string): string {
  const hashIndex = path.indexOf('#')

  return hashIndex === -1 ? '' : path.slice(hashIndex)
}

/**
 * 规范化路由路径：去除 `query/hash`，补前导斜杠，移除尾随斜杠。
 *
 * @remarks
 * - 空路径或仅含空白字符时返回根路径 `/`。
 * - 路径不以 `/` 开头时自动补齐。
 * - 路径末尾的连续斜杠会被移除（根路径 `/` 除外）。
 *
 * @param path - 需要规范化的原始路径
 * @returns 处理后的标准路径
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
