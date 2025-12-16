import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function resolveFromImportMeta(importMetaUrl: string, ...segments: string[]): string {
  const filename = fileURLToPath(importMetaUrl)
  const dir = path.dirname(filename)

  return path.resolve(dir, ...segments)
}
