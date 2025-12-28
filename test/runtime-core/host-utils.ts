import type { NormalizedVirtualNode, RendererOptions } from '@/runtime-core/index.ts'
import { normalizeRenderOutput } from '@/runtime-core/index.ts'
import type { RenderOutput } from '@/jsx-foundation/index.ts'

export interface TestNode {
  kind: 'element' | 'text' | 'comment' | 'fragment'
  children: TestNode[]
  parent?: TestNode
  text?: string
  tag?: string
  props?: Record<string, unknown>
}

export interface TestElement extends TestNode {
  kind: 'element'
}

export interface TestFragment extends TestNode {
  kind: 'fragment'
}

export interface HostRendererHooks {
  patchProps?: (
    element: TestElement,
    previous?: Record<string, unknown>,
    next?: Record<string, unknown>,
  ) => void
  setText?: (node: TestNode, text: string) => void
}

export interface HostRenderer {
  options: RendererOptions<TestNode, TestElement, TestFragment>
  container: TestElement
  counters: {
    appendChild: number
    insertBefore: number
    remove: number
    setText: number
    patchProps: number
  }
  resetCounts(): void
}

export function createHostRenderer(hooks: HostRendererHooks = {}): HostRenderer {
  const counters = {
    appendChild: 0,
    insertBefore: 0,
    remove: 0,
    setText: 0,
    patchProps: 0,
  }

  const removeFromParent = (node: TestNode): void => {
    if (!node.parent) {
      return
    }

    const siblings = node.parent.children
    const index = siblings.indexOf(node)

    if (index !== -1) {
      siblings.splice(index, 1)
    }

    node.parent = undefined
  }

  const appendChild = (parent: TestElement | TestFragment, child: TestNode): void => {
    counters.appendChild += 1
    removeFromParent(child)
    parent.children.push(child)
    child.parent = parent
  }

  const insertBefore = (
    parent: TestElement | TestFragment,
    child: TestNode,
    anchor?: TestNode,
  ): void => {
    counters.insertBefore += 1
    removeFromParent(child)

    if (!anchor) {
      appendChild(parent, child)

      return
    }

    const index = parent.children.indexOf(anchor)

    if (index === -1) {
      throw new Error('anchor not found in parent')
    }

    parent.children.splice(index, 0, child)
    child.parent = parent
  }

  const container: TestElement = { kind: 'element', children: [], tag: 'root' }

  const options: RendererOptions<TestNode, TestElement, TestFragment> = {
    createElement(type): TestElement {
      return { kind: 'element', children: [], tag: type }
    },
    createText(text): TestNode {
      return { kind: 'text', children: [], text }
    },
    createComment(text): TestNode {
      return { kind: 'comment', children: [], text }
    },
    createFragment(): TestFragment {
      return { kind: 'fragment', children: [] }
    },
    setText(node, text): void {
      counters.setText += 1
      node.text = text
      hooks.setText?.(node, text)
    },
    appendChild,
    insertBefore,
    clear(target): void {
      target.children = []
    },
    remove(node): void {
      counters.remove += 1
      removeFromParent(node)
    },
    patchProps(element, previousProps, nextProps): void {
      counters.patchProps += 1
      element.props = nextProps
      hooks.patchProps?.(element, previousProps, nextProps)
    },
  }

  return {
    options,
    container,
    counters,
    resetCounts(): void {
      counters.appendChild = 0
      counters.insertBefore = 0
      counters.remove = 0
      counters.setText = 0
      counters.patchProps = 0
    },
  }
}

/**
 * 在自定义 host 渲染树中按类名查找元素（广度优先，返回首个匹配）。
 */
export function findHostElementByClass(
  root: TestElement | TestFragment,
  className: string,
): TestElement | undefined {
  return breadthFirstSearch(root, (node) => {
    return node.props?.class === className
  })
}

/**
 * 在自定义 host 渲染树中按标签名查找元素（广度优先，返回首个匹配）。
 */
export function findHostElementByTag(
  root: TestElement | TestFragment,
  tag: string,
): TestElement | undefined {
  return breadthFirstSearch(root, (node) => {
    return node.tag === tag
  })
}

/** 读取自定义 host 渲染树中元素的首个文本子节点内容。 */
export function getHostElementText(element?: TestElement): string | undefined {
  if (!element) {
    return undefined
  }

  const textNode = element.children.find((child) => {
    return child.kind === 'text'
  })

  return textNode?.text
}

function breadthFirstSearch(
  root: TestElement | TestFragment,
  predicate: (node: TestElement) => boolean,
): TestElement | undefined {
  const queue: Array<TestElement | TestFragment> = [root]

  while (queue.length > 0) {
    const current = queue.shift()

    if (!current) {
      continue
    }

    if (current.kind === 'element' && predicate(current)) {
      return current
    }

    for (const child of current.children) {
      if (isBranchNode(child)) {
        queue.push(child)
      }
    }
  }

  return undefined
}

function isBranchNode(node: TestNode): node is TestElement | TestFragment {
  return node.kind === 'element' || node.kind === 'fragment'
}

export function normalize(output: RenderOutput): NormalizedVirtualNode {
  const normalized = normalizeRenderOutput(output)

  if (!normalized) {
    throw new Error('expected render output')
  }

  return normalized
}
