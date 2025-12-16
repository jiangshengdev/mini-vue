import { describe, expect, it, vi } from 'vitest'
import { createRenderer } from '@/runtime-core/renderer.ts'
import type { RendererOptions } from '@/runtime-core/renderer.ts'

describe('runtime-core/renderer container key', () => {
  it('throws friendly error when container is not object', () => {
    const options: RendererOptions<unknown, Record<string, unknown>, Record<string, unknown>> = {
      createElement: vi.fn(() => {
        return {}
      }),
      createText: vi.fn(() => {
        return {}
      }),
      createFragment: vi.fn(() => {
        return {}
      }),
      appendChild: vi.fn(),
      insertBefore: vi.fn(),
      clear: vi.fn(),
      remove: vi.fn(),
      patchProps: vi.fn(),
    }

    const renderer = createRenderer<unknown, Record<string, unknown>, Record<string, unknown>>(
      options,
    )

    expect(() => {
      renderer.render('text', 'container' as unknown as Record<string, unknown>)
    }).toThrowError(/容器必须是 object（含函数）类型才能缓存挂载状态/)
  })
})
