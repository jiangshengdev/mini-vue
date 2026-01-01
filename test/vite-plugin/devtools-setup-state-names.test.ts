import { describe, expect, it, vi } from 'vitest'
import { readVitePluginFixture } from './_fixtures.ts'
import { miniVueDevtoolsSetupStateNamesPlugin } from '@/index.ts'

function collectImportStatementsFrom(code: string, source: string): string[] {
  const lines = code.split('\n')
  const statements: string[] = []
  const sourceToken = `from '${source}'`

  let current: string[] = []
  let capturing = false

  for (const line of lines) {
    const trimmed = line.trimStart()

    if (capturing) {
      current.push(line)
    } else if (trimmed.startsWith('import ')) {
      capturing = true
      current = [line]
    } else {
      continue
    }

    if (line.includes(sourceToken)) {
      statements.push(current.join('\n'))
      capturing = false
      current = []
    }
  }

  return statements
}

function expectImportsFrom(code: string | undefined, source: string, names: string[]): void {
  expect(code).toBeDefined()

  const statements = collectImportStatementsFrom(code ?? '', source)

  expect(statements.length).toBeGreaterThan(0)

  const matched = statements.some((statement) => {
    return names.every((name) => {
      return statement.includes(name)
    })
  })

  expect(matched).toBe(true)
}

async function transformWithPlugin(parameters: { code: string; id: string }) {
  const plugin = miniVueDevtoolsSetupStateNamesPlugin({
    importSource: '@/index.ts',
    devOnly: false,
  })

  const hook = plugin.transform
  const handler = typeof hook === 'function' ? hook : hook?.handler

  if (!handler) {
    return
  }

  const result = await (
    handler as unknown as (
      this: { warn: (message: string) => void },
      code: string,
      id: string,
    ) => unknown
  ).call({ warn: vi.fn() }, parameters.code, parameters.id)

  return result as { code?: string } | undefined
}

describe('vite-plugin devtools setup state names', () => {
  it('在 SetupComponent 内注入 register 调用并补齐 import', async () => {
    const code = readVitePluginFixture('devtools-setup-state-names/setupcomponent-inject.tsx')

    const result = await transformWithPlugin({ code, id: '/src/app.tsx' })

    expectImportsFrom(result?.code, '@/index.ts', ['ref', 'registerDevtoolsSetupStateName'])
    expect(result?.code).toContain("registerDevtoolsSetupStateName(count, 'count')")
  })

  it('同名变量会注入 $1 后缀', async () => {
    const code = readVitePluginFixture('devtools-setup-state-names/same-name-suffix.tsx')

    const result = await transformWithPlugin({ code, id: '/src/app.tsx' })

    expect(result?.code).toContain("registerDevtoolsSetupStateName(count, 'count')")
    expect(result?.code).toContain("registerDevtoolsSetupStateName(count, 'count$1')")
  })

  it('普通函数体内也会注入 register 调用', async () => {
    const code = readVitePluginFixture('devtools-setup-state-names/normal-fn.ts')

    const result = await transformWithPlugin({ code, id: '/src/foo.ts' })

    expectImportsFrom(result?.code, '@/index.ts', ['ref', 'registerDevtoolsSetupStateName'])
    expect(result?.code).toContain("registerDevtoolsSetupStateName(count, 'count')")
  })

  it('在 composable 内注入 register 调用', async () => {
    const code = readVitePluginFixture('devtools-setup-state-names/composable.tsx')

    const result = await transformWithPlugin({ code, id: '/src/app.tsx' })

    expectImportsFrom(result?.code, '@/index.ts', ['state', 'registerDevtoolsSetupStateName'])
    expect(result?.code).toContain("registerDevtoolsSetupStateName(isOpen, 'isOpen')")
  })

  it('仅识别从指定 importSource 引入的 ref/reactive/computed/state', async () => {
    const code = readVitePluginFixture('devtools-setup-state-names/import-source-mismatch.tsx')

    const result = await transformWithPlugin({ code, id: '/src/app.tsx' })

    expect(result).toBeUndefined()
  })
})
