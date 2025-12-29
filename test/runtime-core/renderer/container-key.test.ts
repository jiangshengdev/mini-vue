import { describe, expect, it, vi } from 'vitest'
import { runtimeCoreInvalidContainer } from '@/messages/index.ts'
import type { RendererOptions } from '@/runtime-core/index.ts'
import { createRenderer } from '@/runtime-core/index.ts'

describe('runtime-core/renderer 容器键', () => {
  it('当 container 不是对象时抛出友好错误', () => {
    const options = createMinimalRendererOptions()

    const renderer = createRenderer<unknown, Record<string, unknown>, Record<string, unknown>>(
      options,
    )

    let caught: unknown

    try {
      renderer.render('text', 'container' as unknown as Record<string, unknown>)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(TypeError)
    expect((caught as Error).message).toBe(runtimeCoreInvalidContainer)
    expect((caught as Error & { cause: unknown }).cause).toBe('container')
  })
})

function createMinimalRendererOptions(): RendererOptions<
  unknown,
  Record<string, unknown>,
  Record<string, unknown>
> {
  const createStub = () => {
    return vi.fn(() => {
      return {}
    })
  }

  return {
    createElement: createStub(),
    createText: createStub(),
    createComment: createStub(),
    createFragment: createStub(),
    setText: vi.fn(),
    appendChild: vi.fn(),
    insertBefore: vi.fn(),
    nextSibling: vi.fn(),
    clear: vi.fn(),
    remove: vi.fn(),
    patchProps: vi.fn(),
  }
}
