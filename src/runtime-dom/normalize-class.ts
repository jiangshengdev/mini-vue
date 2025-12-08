import { isNil, isObject } from '@/shared/index.ts'

export function normalizeClass(value: unknown): string {
  const tokens: string[] = []

  appendNormalized(value, tokens)

  return tokens.join(' ').trim()
}

function appendNormalized(input: unknown, tokens: string[]): void {
  if (isNil(input)) {
    return
  }

  if (typeof input === 'string') {
    if (input.length > 0) {
      tokens.push(input)
    }

    return
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      appendNormalized(item, tokens)
    }

    return
  }

  if (isObject(input)) {
    for (const [name, active] of Object.entries(input as Record<string, unknown>)) {
      if (active) {
        tokens.push(name)
      }
    }
  }
}
