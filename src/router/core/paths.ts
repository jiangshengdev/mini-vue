const trailingSlashRe = /\/+$/

function stripQueryAndHash(path: string): string {
  const hashIndex = path.indexOf('#')
  const queryIndex = path.indexOf('?')
  const cutIndex = Math.min(
    hashIndex === -1 ? path.length : hashIndex,
    queryIndex === -1 ? path.length : queryIndex,
  )

  return path.slice(0, cutIndex)
}

export function normalizePath(path: string): string {
  if (!path) return '/'
  let normalized = stripQueryAndHash(path)

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`
  }

  if (normalized.length > 1 && trailingSlashRe.test(normalized)) {
    normalized = normalized.replace(trailingSlashRe, '')
  }

  normalized = normalized.toLowerCase()

  return normalized || '/'
}
