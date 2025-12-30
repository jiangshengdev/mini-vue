import { describe, expectTypeOf, it } from 'vitest'
import type { ElementType, SetupComponent, VirtualNode } from '@/index.ts'
import { h } from '@/index.ts'

describe('jsx-foundation typing: ElementType', () => {
  it('允许将 SetupComponent 赋值给 ElementType 并在 TSX 中使用', () => {
    const Foo: SetupComponent<{ msg: string }> = (props) => {
      return () => {
        return <div>{props.msg}</div>
      }
    }

    const X: ElementType = Foo
    const node = <X msg="hi" />

    expectTypeOf(node).toEqualTypeOf<VirtualNode>()
  })

  it('h() 接受 ElementType 变量并保留可用的 props 形态', () => {
    const Foo: SetupComponent<{ msg: string }> = () => {
      return () => {
        return <div />
      }
    }

    const render = (type: ElementType) => {
      return h(type, { msg: 'hi' })
    }

    const node = render(Foo)

    expectTypeOf(node).toEqualTypeOf<VirtualNode>()
  })
})
