import { describe, expect, it, vi } from 'vitest'
import { miniVueCompilerPlugin } from '@/index.ts'
import { readVitePluginFixture } from './_fixtures.ts'

function expectContainsInOrder(code: string | undefined, parts: string[]): void {
  expect(code).toBeDefined()

  const text = code ?? ''
  let lastIndex = -1

  for (const part of parts) {
    const index = text.indexOf(part)

    expect(index).toBeGreaterThan(-1)
    expect(index).toBeGreaterThan(lastIndex)

    lastIndex = index
  }
}

async function transformWithCompilerPlugin(parameters: {
  code: string
  id: string
  diagnostics?: Record<string, unknown>
}) {
  const plugins = miniVueCompilerPlugin({
    importSource: '@/index.ts',
    devtoolsSetupStateNames: false,
    transformPropsDestructure: parameters.diagnostics
      ? { diagnostics: parameters.diagnostics }
      : {},
  })
  const plugin = plugins.find((item) => {
    return (
      typeof item === 'object' &&
      item &&
      'name' in item &&
      item.name === 'mini-vue:transform-props-destructure'
    )
  })

  const hook = plugin && 'transform' in plugin ? plugin.transform : undefined
  const handler = typeof hook === 'function' ? hook : hook?.handler

  if (!handler) {
    return { warn: vi.fn(), error: vi.fn() }
  }

  const warn = vi.fn()
  const error = vi.fn((payload: unknown) => {
    const message =
      typeof payload === 'string'
        ? payload
        : typeof payload === 'object' && payload && 'message' in payload
          ? String((payload as { message?: unknown }).message)
          : ''

    throw new Error(message || 'error')
  })

  const result = await (
    handler as unknown as (
      this: { warn: typeof warn; error: typeof error },
      code: string,
      id: string,
    ) => unknown
  ).call({ warn, error }, parameters.code, parameters.id)

  return { result: result as { code?: string } | undefined, warn, error }
}

describe('vite-plugin transform props destructure', () => {
  it('改写顶层解构引用为 props 访问并移除声明', async () => {
    const code = readVitePluginFixture('props-destructure/top-level.tsx')

    const { result } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result?.code).toBeDefined()
    expect(result?.code).not.toContain('{ foo } = props')
    expect(result?.code).toContain('const value = props.foo + 1')
    expectContainsInOrder(result?.code, ['<div>', '{props.foo}', '{value}', '</div>'])
  })

  it('在嵌套函数与返回 render 闭包内改写且处理作用域遮蔽', async () => {
    const code = readVitePluginFixture('props-destructure/nested-shadow.tsx')

    const { result } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result?.code).toContain('return foo')
    expectContainsInOrder(result?.code, ['<div>', '{props.foo}', '{render()}', '</div>'])
  })

  it('在 watch/toRef 直接使用解构变量时输出 warning', async () => {
    const code = readVitePluginFixture('props-destructure/watch-toRef-warning.tsx')

    const { result, warn } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(warn).toHaveBeenCalledTimes(2)
    expect(result?.code).toContain('watch(props.foo, () => {})')
    expect(result?.code).toContain("toRef(props.foo, 'bar')")
  })

  it('支持多字段与 alias 解构', async () => {
    const code = readVitePluginFixture('props-destructure/multi-alias.tsx')

    const { result } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result?.code).not.toContain('{ foo, bar: baz } = props')
    expectContainsInOrder(result?.code, ['<div>', '{props.foo}', '{props.bar}', '</div>'])
  })

  it('支持参数解构改写', async () => {
    const code = readVitePluginFixture('props-destructure/param-destructure.tsx')

    const { result } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result?.code).toContain('(props) =>')
    expectContainsInOrder(result?.code, ['<div>', '{props.foo}', '{props.bar}', '</div>'])
  })

  it('识别 watch/toRef 的导入别名并发出 warning', async () => {
    const code = readVitePluginFixture('props-destructure/import-alias.tsx')

    const { result, warn } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(warn).toHaveBeenCalledTimes(2)
    expect(result?.code).toContain('w(props.foo, () => {})')
    expect(result?.code).toContain("r(props.foo, 'bar')")
  })

  it('嵌套 block 内的解构会提示 warning 并跳过改写', async () => {
    const code = readVitePluginFixture('props-destructure/nested-block.tsx')

    const { result, warn } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(warn).toHaveBeenCalledOnce()
    expect(result).toBeUndefined()
  })

  it('支持非 identifier 的 prop key 改写', async () => {
    const code = readVitePluginFixture('props-destructure/non-identifier-keys.tsx')

    const { result } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expectContainsInOrder(result?.code, ['<div>', "{props['foo.bar']}", "{props['baz']}", '</div>'])
  })

  it('写入解构变量会报错', async () => {
    const code = readVitePluginFixture('props-destructure/write-to-destructured.tsx')

    await expect(
      transformWithCompilerPlugin({
        code,
        id: '/src/app.tsx',
      }),
    ).rejects.toThrow('props 解构变量')
  })

  it('非 SetupComponent 或未命中模式不做改写', async () => {
    const code = readVitePluginFixture('props-destructure/non-setupcomponent.tsx')

    const { result } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result).toBeUndefined()
  })
})
