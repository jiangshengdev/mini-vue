import { describe, expect, it, vi } from 'vitest'
import { readVitePluginFixture } from './_fixtures.ts'
import { miniVueDevtoolsSetupComponentFilePlugin } from '@/index.ts'

async function transformWithPlugin(parameters: {
  code: string
  id: string
  filePathMode?: 'relative' | 'absolute'
}) {
  const plugin = miniVueDevtoolsSetupComponentFilePlugin({
    importSource: '@/index.ts',
    devOnly: false,
    root: '/project',
    filePathMode: parameters.filePathMode,
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

describe('vite-plugin devtools setup component file', () => {
  it('为 SetupComponent 注入 __file（相对路径）', async () => {
    const code = readVitePluginFixture('devtools-setup-component-file/basic.tsx')

    const result = await transformWithPlugin({ code, id: '/project/src/app.tsx' })

    expect(result?.code).toContain(
      "if (typeof Inner === 'function') Inner.__file ??= 'src/app.tsx'",
    )
    expect(result?.code).toContain(
      "if (typeof Nested === 'function') Nested.__file ??= 'src/app.tsx'",
    )
    expect(result?.code).toContain("if (typeof App === 'function') App.__file ??= 'src/app.tsx'")
  })

  it('支持回退为绝对路径', async () => {
    const code = readVitePluginFixture('devtools-setup-component-file/basic.tsx')

    const result = await transformWithPlugin({
      code,
      id: '/project/src/app.tsx',
      filePathMode: 'absolute',
    })

    expect(result?.code).toContain(
      "if (typeof Inner === 'function') Inner.__file ??= '/project/src/app.tsx'",
    )
  })

  it('仅对指定 importSource 的 SetupComponent 生效', async () => {
    const code = readVitePluginFixture('devtools-setup-component-file/import-source-mismatch.tsx')

    const result = await transformWithPlugin({ code, id: '/project/src/app.tsx' })

    expect(result).toBeUndefined()
  })
})
