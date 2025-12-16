import { describe, expect, it, vi } from 'vitest'
import { createRenderer } from '@/runtime-core/renderer.ts'

describe('runtime-core/renderer container key', () => {
  it('throws friendly error when container is not object', () => {
    const options = {
      createElement: vi.fn(),
      createText: vi.fn(),
      createFragment: vi.fn(),
      appendChild: vi.fn(),
      insertBefore: vi.fn(),
      clear: vi.fn(),
      remove: vi.fn(),
      patchProps: vi.fn(),
    }

    const renderer = createRenderer<any, any, any>(options as never)

    expect(() => renderer.render('text', 'container' as never)).toThrowError(
      /容器必须是 object 类型/,
    )
  })
})
