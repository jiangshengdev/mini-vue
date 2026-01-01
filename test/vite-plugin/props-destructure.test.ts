import { describe, expect, it, vi } from 'vitest'
import { miniVueCompilerPlugin } from '@/index.ts'

async function transformWithCompilerPlugin(parameters: {
  code: string
  id: string
  diagnostics?: object
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
    const code = `
import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { foo } = props
  const value = foo + 1
  return () => <div>{foo}{value}</div>
}
`

    const { result } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result?.code).toBeDefined()
    expect(result?.code).not.toContain('{ foo } = props')
    expect(result?.code).toContain('const value = props.foo + 1')
    expect(result?.code).toContain('return () => <div>{props.foo}{value}</div>')
  })

  it('在嵌套函数与返回 render 闭包内改写且处理作用域遮蔽', async () => {
    const code = `
import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { foo } = props
  const render = () => {
    const foo = 1
    return foo
  }
  return () => <div>{foo}{render()}</div>
}
`

    const { result } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result?.code).toContain('return foo')
    expect(result?.code).toContain('return () => <div>{props.foo}{render()}</div>')
  })

  it('在 watch/toRef 直接使用解构变量时输出 warning', async () => {
    const code = `
import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { foo } = props
  watch(foo, () => {})
  toRef(foo)
  return () => <div>{foo}</div>
}
`

    const { result, warn } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(warn).toHaveBeenCalledTimes(2)
    expect(result?.code).toContain('watch(props.foo, () => {})')
    expect(result?.code).toContain('toRef(props.foo)')
  })

  it('支持多字段与 alias 解构', async () => {
    const code = `
import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { foo, bar: baz } = props
  return () => <div>{foo}{baz}</div>
}
`

    const { result } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result?.code).not.toContain('{ foo, bar: baz } = props')
    expect(result?.code).toContain('return () => <div>{props.foo}{props.bar}</div>')
  })

  it('支持参数解构改写', async () => {
    const code = `
import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = ({ foo, bar }) => {
  return () => <div>{foo}{bar}</div>
}
`

    const { result } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result?.code).toContain('(props) =>')
    expect(result?.code).toContain('<div>{props.foo}{props.bar}</div>')
  })

  it('识别 watch/toRef 的导入别名并发出 warning', async () => {
    const code = `
import type { SetupComponent } from '@/index.ts'
import { watch as w, toRef as r } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { foo } = props
  w(foo, () => {})
  r(foo)
  return () => <div>{foo}</div>
}
`

    const { result, warn } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(warn).toHaveBeenCalledTimes(2)
    expect(result?.code).toContain('w(props.foo, () => {})')
    expect(result?.code).toContain('r(props.foo)')
  })

  it('嵌套 block 内的解构会提示 warning 并跳过改写', async () => {
    const code = `
import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  if (true) {
    const { foo } = props
    return () => <div>{foo}</div>
  }
  return () => <div>{props.foo}</div>
}
`

    const { result, warn } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(warn).toHaveBeenCalledOnce()
    expect(result).toBeUndefined()
  })

  it('支持非 identifier 的 prop key 改写', async () => {
    const code = `
import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { 'foo.bar': fooBar, ['baz']: baz } = props
  return () => <div>{fooBar}{baz}</div>
}
`

    const { result } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result?.code).toContain("return () => <div>{props['foo.bar']}{props['baz']}</div>")
  })

  it('写入解构变量会报错', async () => {
    const code = `
import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { foo } = props
  foo = 1
  return () => <div />
}
`

    await expect(
      transformWithCompilerPlugin({
        code,
        id: '/src/app.tsx',
      }),
    ).rejects.toThrow(/props 解构变量/)
  })

  it('非 SetupComponent 或未命中模式不做改写', async () => {
    const code = `
export const App = (props: { foo: string }) => {
  const { foo } = props
  return () => <div>{foo}</div>
}
`

    const { result } = await transformWithCompilerPlugin({
      code,
      id: '/src/app.tsx',
    })

    expect(result).toBeUndefined()
  })
})
