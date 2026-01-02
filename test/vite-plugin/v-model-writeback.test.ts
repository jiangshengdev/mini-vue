import { describe, expect, it, vi } from 'vitest'
import { readVitePluginFixture } from './_fixtures.ts'
import { miniVueCompilerPlugin } from '@/index.ts'

async function transformWithModelBindingWritebackPlugin(parameters: { code: string; id: string }) {
  const plugins = miniVueCompilerPlugin({
    importSource: '@/index.ts',
    devtoolsSetupStateNames: false,
    transformPropsDestructure: false,
  })
  const plugin = plugins.find((item) => {
    return (
      typeof item === 'object' &&
      item &&
      'name' in item &&
      item.name === 'mini-vue:transform-v-model-writeback'
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

describe('vite-plugin v-model writeback', () => {
  it('组件 v-model 展开为 modelValue 与写回闭包', async () => {
    const code = readVitePluginFixture('v-model-writeback/basic.tsx')

    const { result } = await transformWithModelBindingWritebackPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result?.code).toContain('modelValue={model.value}')
    expect(result?.code).toContain("{ 'onUpdate:modelValue': (value) => { model.value = value } }")
    expect(result?.code).not.toContain('v-model')
  })

  it('支持静态深层路径与字符串下标', async () => {
    const code = readVitePluginFixture('v-model-writeback/deep-path.tsx')

    const { result } = await transformWithModelBindingWritebackPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result?.code).toContain("modelValue={state.form['foo-bar'].bar}")
    expect(result?.code).toContain(
      "{ 'onUpdate:modelValue': (value) => { state.form['foo-bar'].bar = value } }",
    )
  })

  it('跳过内置标签的 v-model', async () => {
    const code = readVitePluginFixture('v-model-writeback/builtin-skip.tsx')

    const { result, warn } = await transformWithModelBindingWritebackPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result).toBeUndefined()
    expect(warn).not.toHaveBeenCalled()
  })

  it('动态 key 输出 warning 并跳过改写', async () => {
    const code = readVitePluginFixture('v-model-writeback/dynamic-key.tsx')

    const { result, warn } = await transformWithModelBindingWritebackPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result).toBeUndefined()
    expect(warn).toHaveBeenCalledOnce()
  })
})
