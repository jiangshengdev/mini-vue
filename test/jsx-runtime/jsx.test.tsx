import { describe, expect, it, vi } from 'vitest'
import { isVirtualNode, virtualNodeFlag } from '@/jsx-foundation/index.ts'

/**
 * 这些用例通过真实 jsx 语法触发 TS 的自动 jsx 转换，
 * 从而间接验证 runtime 暴露的 `jsx` 函数行为是否符合预期。
 * `jsxs` / `jsxDEV` 复用同一实现，无需重复校验。
 */
describe('jsx-runtime automatic jsx helper', () => {
  it('归一化 props.children 并剔除剩余 props 中的 children', () => {
    const virtualNode = (
      <section id="root" data-ctx="stub">
        {['first', 2, false, null, ['nested', undefined]]}
      </section>
    )

    expect(virtualNode.children).toEqual(['first', 2, 'nested'])
    expect(virtualNode.props).toEqual({ id: 'root', 'data-ctx': 'stub' })
  })

  it('忽略对象与函数等不可渲染的 children', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      return undefined
    })

    const rawObject = { foo: 'bar' }
    const fnChild = () => {
      return 'noop'
    }

    const symbolChild = Symbol('skip-me')

    try {
      const virtualNode = (
        <div>
          {[
            'text',
            rawObject,
            fnChild,
            symbolChild,
            <span id="label">label</span>,
            0,
            [{ nested: true }, ['inner']],
          ]}
        </div>
      )

      expect(virtualNode.children).toHaveLength(4)
      const [textChild, spanChild, zeroChild, innerChild] = virtualNode.children

      expect(textChild).toBe('text')
      expect(isVirtualNode(spanChild)).toBe(true)
      expect(zeroChild).toBe(0)
      expect(innerChild).toBe('inner')
      expect(warnSpy).toHaveBeenCalledTimes(4)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('将 key 从 jsx 属性提升为 virtualNode.key', () => {
    const virtualNode = <li key="row-1">{['row']}</li>

    expect(virtualNode.key).toBe('row-1')
    expect(virtualNode.props).toBeUndefined()
  })

  it('保留 props 引用的不可变语义', () => {
    const sharedProps = { title: 'dev-only' }
    const child = <span>label</span>
    const virtualNode = <article {...sharedProps}>{child}</article>

    expect(virtualNode.props).toEqual({ title: 'dev-only' })
    expect(virtualNode.children).toEqual([child])
    expect(sharedProps).toEqual({ title: 'dev-only' })
  })

  it('支持数组表达式作为单子节点以保留 jsx 调用路径', () => {
    const virtualNode = <ul class="list">{[<li id="a">A</li>, [<li id="b">B</li>], false, 0]}</ul>

    expect(virtualNode.props).toEqual({ class: 'list' })
    expect(virtualNode.children).toHaveLength(3)
    expect(isVirtualNode(virtualNode.children[0])).toBe(true)
    expect(isVirtualNode(virtualNode.children[1])).toBe(true)
    expect(virtualNode.children[2]).toBe(0)
  })

  it('支持通过展开语法传入的 key', () => {
    const spreadProps = { key: 'row-1', class: 'row' }
    const virtualNode = <li {...spreadProps}>row</li>

    expect(virtualNode.key).toBe('row-1')
    expect(virtualNode.props).toEqual({ class: 'row' })
  })

  it('忽略伪造的 virtualNode 标记', () => {
    const forgedNode = { [virtualNodeFlag]: 'spoofed' }

    expect(isVirtualNode(forgedNode)).toBe(false)
  })
})
