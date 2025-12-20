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

    expect(() => {
      renderer.render('text', 'container' as unknown as Record<string, unknown>)
    }).toThrowError(runtimeCoreInvalidContainer)
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
    createFragment: createStub(),
    setText: vi.fn(),
    appendChild: vi.fn(),
    insertBefore: vi.fn(),
    clear: vi.fn(),
    remove: vi.fn(),
    patchProps: vi.fn(),
  }
}
