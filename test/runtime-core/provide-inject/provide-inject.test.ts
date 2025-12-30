import { describe, expect, it } from 'vitest'
import { runtimeCoreInjectOutsideSetup, runtimeCoreProvideOutsideSetup } from '@/messages/index.ts'
import { inject, provide } from '@/index.ts'

describe('runtime-core provide/inject 错误 cause', () => {
  it('provide 在组件外调用时暴露 currentInstance 上下文', () => {
    const token = Symbol('token')
    let caught: unknown

    try {
      provide(token, 1)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(Error)
    const error = caught as Error

    expect(error.message).toBe(runtimeCoreProvideOutsideSetup)
    expect(error.cause).toEqual(expect.anything())
    expect(typeof error.cause).toBe('object')
  })

  it('inject 在组件外调用时暴露 currentInstance 上下文', () => {
    const token = Symbol('token')
    let caught: unknown

    try {
      inject(token)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(Error)
    const error = caught as Error

    expect(error.message).toBe(runtimeCoreInjectOutsideSetup)
    expect(error.cause).toEqual(expect.anything())
    expect(typeof error.cause).toBe('object')
  })
})
