import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures')

export function readVitePluginFixture(path: string): string {
  let content = readFileSync(resolve(fixturesRoot, path), 'utf8')

  if (!content.endsWith('\n')) {
    content += '\n'
  }

  return `\n${content}`
}
