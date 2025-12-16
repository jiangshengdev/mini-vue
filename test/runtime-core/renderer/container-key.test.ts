import { describe, expect, it, vi } from 'vitest'
import { createRenderer } from '@/runtime-core/renderer.ts'
import type { RendererOptions } from '@/runtime-core/renderer.ts'

describe('runtime-core/renderer container key', () => {
  it('throws friendly error when container is not object', () => {
    const options: RendererOptions<unknown, object, object> = {
      createElement: vi.fn(() => ({})),
      createText: vi.fn(() => ({})),
      createFragment: vi.fn(() => ({})),
      appendChild: vi.fn(),
      insertBefore: vi.fn(),
      clear: vi.fn(),
      remove: vi.fn(),
      patchProps: vi.fn(),
    }

    const renderer = createRenderer<unknown, object, object>(options)

    expect(() => renderer.render('text', 'container' as unknown as object)).toThrowError(
      /容器必须是 object（含函数）类型才能缓存挂载状态/,
    )
  })
})
