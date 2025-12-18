import { describe, expectTypeOf, it } from 'vitest'
import type {
  NormalizedChildren,
  NormalizedVirtualNode,
  patchChild,
  patchChildren,
  PatchEnvironment,
} from '@/runtime-core/index.ts'
import { normalizeRenderOutput } from '@/runtime-core/index.ts'
import { createTextVirtualNode } from '@/jsx-foundation/index.ts'

interface TestNode {
  kind: 'element' | 'text' | 'fragment'
}

type TestElement = TestNode

type TestFragment = TestNode

describe('patch typing', () => {
  it('patchChild 参数接受归一化 vnode 或空值', () => {
    type ParametersTuple = Parameters<typeof patchChild<TestNode, TestElement, TestFragment>>

    expectTypeOf<ParametersTuple[1]>().toEqualTypeOf<NormalizedVirtualNode | undefined>()
    expectTypeOf<ParametersTuple[2]>().toEqualTypeOf<NormalizedVirtualNode | undefined>()
    expectTypeOf<ParametersTuple[3]>().toEqualTypeOf<
      PatchEnvironment<TestNode, TestElement, TestFragment>
    >()

    const normalized = normalizeRenderOutput(createTextVirtualNode('text'))

    expectTypeOf(normalized).toEqualTypeOf<NormalizedVirtualNode | undefined>()
    // @ts-expect-error patchChild 不接受未归一化的原始文本/children
    const _invalidPrevious: ParametersTuple[1] = 'raw-text'
    // @ts-expect-error patchChild 不接受未归一化的原始文本/children
    const _invalidNext: ParametersTuple[2] = 1
  })

  it('patchChildren 参数限定为归一化 children', () => {
    type ParametersTuple = Parameters<typeof patchChildren<TestNode, TestElement, TestFragment>>

    expectTypeOf<ParametersTuple[1]>().toEqualTypeOf<NormalizedChildren>()
    expectTypeOf<ParametersTuple[2]>().toEqualTypeOf<NormalizedChildren>()

    const normalized = normalizeRenderOutput(createTextVirtualNode('child'))

    if (normalized) {
      const validChildren: ParametersTuple[1] = [normalized]

      expectTypeOf(validChildren).toEqualTypeOf<NormalizedChildren>()
    }

    // @ts-expect-error patchChildren 不接受包含原始文本的 children 数组
    const _invalidChildren: ParametersTuple[1] = ['raw']
  })
})
