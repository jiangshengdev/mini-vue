import { isNil, isObject } from '@/shared/index.ts'

export function normalizeClass(value: unknown): string {
  const tokens: string[] = []

  collectClassTokens(value, tokens)

  return tokens.join(' ').trim()
}

function collectClassTokens(source: unknown, tokens: string[]): void {
  if (isNil(source)) {
    return
  }

  if (typeof source === 'string') {
    if (source.length > 0) {
      tokens.push(source)
    }

    return
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      collectClassTokens(item, tokens)
    }

    return
  }

  if (isObject(source)) {
    for (const [name, active] of Object.entries(source as Record<string, unknown>)) {
      if (active) {
        tokens.push(name)
      }
    }
  }
}
