import { mountChild } from '../mount/index.ts'
import type { MountContext } from '../mount/context.ts'
import { assignElementRef, resolveElementRefBinding } from '../mount/element.ts'
import type { RendererOptions } from '../renderer.ts'
import { resolveComponentProps } from '../component/props.ts'
import type { ComponentInstance } from '../component/context.ts'
import { asRuntimeVNode } from '../vnode.ts'
import type { SetupComponent, VirtualNode, VirtualNodeChild } from '@/jsx-foundation/index.ts'
import { Fragment, Text } from '@/jsx-foundation/index.ts'

type ContainerLike<HostNode, HostElement extends HostNode, HostFragment extends HostNode> =
  | HostElement
  | HostFragment

interface PatchContext {
  parent?: ComponentInstance<unknown, WeakKey, unknown, SetupComponent>
  appContext?: unknown
}

export function patchChild<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  prev: VirtualNode | undefined,
  next: VirtualNode | undefined,
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  anchor?: HostNode,
  context?: PatchContext,
): void {
  if (prev === next) {
    return
  }

  if (!prev) {
    if (!next) {
      return
    }

    const mounted = mountChild(options, next, container, normalizeMountContext(context))

    if (mounted && anchor) {
      moveNodes(options, mounted.nodes, container, anchor)
    }

    return
  }

  if (!next) {
    unmount(options, prev)

    return
  }

  if (isSameVirtualNode(prev, next)) {
    patchExisting(options, prev, next, container, anchor, context)

    return
  }

  unmount(options, prev)
  const mounted = mountChild(options, next, container, normalizeMountContext(context))

  if (mounted && anchor) {
    moveNodes(options, mounted.nodes, container, anchor)
  }
}

function patchExisting<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  prev: VirtualNode,
  next: VirtualNode,
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  anchor?: HostNode,
  context?: PatchContext,
): void {
  if (next.type === Text) {
    const runtimePrev = asRuntimeVNode<HostNode, HostElement, HostFragment>(prev)
    const runtimeNext = asRuntimeVNode<HostNode, HostElement, HostFragment>(next)

    runtimeNext.el = runtimePrev.el
    runtimeNext.handle = runtimePrev.handle
    runtimeNext.anchor = runtimePrev.anchor
    runtimeNext.component = undefined

    if (runtimePrev.el) {
      options.setText(runtimePrev.el, (next as VirtualNode<typeof Text> & { text?: string }).text ?? '')
    }

    return
  }

  if (next.type === Fragment) {
    const runtimePrev = asRuntimeVNode<HostNode, HostElement, HostFragment>(prev)
    const runtimeNext = asRuntimeVNode<HostNode, HostElement, HostFragment>(next)

    runtimeNext.el = runtimePrev.el
    runtimeNext.anchor = runtimePrev.anchor
    runtimeNext.handle = runtimePrev.handle
    runtimeNext.component = undefined

    patchChildren(
      options,
      prev.children,
      next.children,
      container,
      runtimePrev.anchor ?? anchor,
      context,
    )

    return
  }

  if (typeof next.type === 'function') {
    patchComponent(options, prev, next, container, anchor, context)

    return
  }

  patchElement(options, prev, next, container, anchor, context)
}

function patchElement<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  prev: VirtualNode,
  next: VirtualNode,
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  anchor: HostNode | undefined,
  context?: PatchContext,
): void {
  const runtimePrev = asRuntimeVNode<HostNode, HostElement, HostFragment>(prev)
  const runtimeNext = asRuntimeVNode<HostNode, HostElement, HostFragment>(next)
  const el = runtimePrev.el as HostElement

  runtimeNext.el = el
  runtimeNext.anchor = undefined
  runtimeNext.handle = runtimePrev.handle
  runtimeNext.component = undefined

  const prevRef = resolveElementRefBinding<HostElement>(prev.props?.ref)
  const nextRef = resolveElementRefBinding<HostElement>(next.props?.ref)

  if (prevRef) {
    assignElementRef(prevRef, undefined)
  }

  options.patchProps(el, prev.props, next.props)
  patchChildren(options, prev.children, next.children, el, anchor, context)

  if (nextRef) {
    assignElementRef(nextRef, el)
  }
}

function patchComponent<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  prev: VirtualNode,
  next: VirtualNode,
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  anchor: HostNode | undefined,
  context?: PatchContext,
): void {
  const runtimePrev = asRuntimeVNode<HostNode, HostElement, HostFragment>(prev)
  const runtimeNext = asRuntimeVNode<HostNode, HostElement, HostFragment>(next)
  const instance = runtimePrev.component

  if (!instance) {
    const mounted = mountChild(options, next, container, normalizeMountContext(context))

    if (mounted && anchor) {
      moveNodes(options, mounted.nodes, container, anchor)
    }

    return
  }

  runtimeNext.component = instance
  runtimeNext.handle = runtimePrev.handle
  runtimeNext.el = runtimePrev.el
  runtimeNext.anchor = runtimePrev.anchor
  instance.props = resolveComponentProps(next as never)
  const runner = instance.effect?.run.bind(instance.effect)

  if (instance.effect?.scheduler && runner) {
    instance.effect.scheduler(runner)
  } else if (runner) {
    const previousSubTree = instance.subTree

    runner()
    patchChild(options, previousSubTree, instance.subTree, container, anchor, context)
  }
}

export function patchChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  prevChildren: VirtualNodeChild[],
  nextChildren: VirtualNodeChild[],
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  anchor?: HostNode,
  context?: PatchContext,
): void {
  const isKeyed = hasKeys(nextChildren) || hasKeys(prevChildren)

  if (isKeyed) {
    patchKeyedChildren(options, prevChildren, nextChildren, container, anchor, context)

    return
  }

  patchUnkeyedChildren(options, prevChildren, nextChildren, container, anchor, context)
}

function patchUnkeyedChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  prevChildren: VirtualNodeChild[],
  nextChildren: VirtualNodeChild[],
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  anchor?: HostNode,
  context?: PatchContext,
): void {
  const commonLength = Math.min(prevChildren.length, nextChildren.length)

  for (let index = 0; index < commonLength; index += 1) {
    patchChild(
      options,
      prevChildren[index] as VirtualNode,
      nextChildren[index] as VirtualNode,
      container,
      anchor,
      normalizeChildContext(context, index, nextChildren.length),
    )
  }

  if (nextChildren.length > prevChildren.length) {
    for (let index = commonLength; index < nextChildren.length; index += 1) {
      const next = nextChildren[index] as VirtualNode
      const nextAnchor = findNextAnchor(nextChildren, index + 1, anchor)
      const mounted = mountChild(options, next, container, normalizeChildContext(context, index, nextChildren.length))

      if (mounted && nextAnchor) {
        moveNodes(options, mounted.nodes, container, nextAnchor)
      }
    }
  } else if (prevChildren.length > nextChildren.length) {
    for (let index = commonLength; index < prevChildren.length; index += 1) {
      unmount(options, prevChildren[index] as VirtualNode)
    }
  }
}

function patchKeyedChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  prevChildren: VirtualNodeChild[],
  nextChildren: VirtualNodeChild[],
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  anchor?: HostNode,
  context?: PatchContext,
): void {
  let oldStart = 0
  let newStart = 0
  let oldEnd = prevChildren.length - 1
  let newEnd = nextChildren.length - 1

  while (
    oldStart <= oldEnd &&
    newStart <= newEnd &&
    isSameVirtualNode(prevChildren[oldStart] as VirtualNode, nextChildren[newStart] as VirtualNode)
  ) {
    patchChild(
      options,
      prevChildren[oldStart] as VirtualNode,
      nextChildren[newStart] as VirtualNode,
      container,
      anchor,
      normalizeChildContext(context, newStart, nextChildren.length),
    )
    oldStart += 1
    newStart += 1
  }

  while (
    oldStart <= oldEnd &&
    newStart <= newEnd &&
    isSameVirtualNode(prevChildren[oldEnd] as VirtualNode, nextChildren[newEnd] as VirtualNode)
  ) {
    patchChild(
      options,
      prevChildren[oldEnd] as VirtualNode,
      nextChildren[newEnd] as VirtualNode,
      container,
      anchor,
      normalizeChildContext(context, newEnd, nextChildren.length),
    )
    oldEnd -= 1
    newEnd -= 1
  }

  if (oldStart > oldEnd) {
    const insertAnchor = findNextAnchor(nextChildren, newEnd + 1, anchor)

    for (let index = oldStart; index <= newEnd; index += 1) {
      const mounted = mountChild(
        options,
        nextChildren[index] as VirtualNode,
        container,
        normalizeChildContext(context, index, nextChildren.length),
      )

      if (mounted && insertAnchor) {
        moveNodes(options, mounted.nodes, container, insertAnchor)
      }
    }

    return
  }

  if (newStart > newEnd) {
    for (let index = oldStart; index <= oldEnd; index += 1) {
      unmount(options, prevChildren[index] as VirtualNode)
    }

    return
  }

  const keyToNewIndexMap = new Map<PropertyKey, number>()
  const toBePatched = newEnd - newStart + 1
  const newIndexToOldIndexMap = new Array<number>(toBePatched).fill(0)

  for (let index = newStart; index <= newEnd; index += 1) {
    const child = nextChildren[index] as VirtualNode

    if (child.key != null) {
      keyToNewIndexMap.set(child.key, index)
    }
  }

  for (let index = oldStart; index <= oldEnd; index += 1) {
    const prevChild = prevChildren[index] as VirtualNode
    const newIndex =
      prevChild.key != null ? keyToNewIndexMap.get(prevChild.key) : findUnkeyedMatch(prevChild, nextChildren, newStart, newEnd)

    if (newIndex === undefined) {
      unmount(options, prevChild)
    } else {
      newIndexToOldIndexMap[newIndex - newStart] = index + 1
      patchChild(
        options,
        prevChild,
        nextChildren[newIndex] as VirtualNode,
        container,
        anchor,
        normalizeChildContext(context, newIndex, nextChildren.length),
      )
    }
  }

  for (let index = toBePatched - 1; index >= 0; index -= 1) {
    const newIndex = newStart + index
    const nextChild = nextChildren[newIndex] as VirtualNode
    const anchorNode = findNextAnchor(nextChildren, newIndex + 1, anchor)

    if (newIndexToOldIndexMap[index] === 0) {
      const mounted = mountChild(
        options,
        nextChild,
        container,
        normalizeChildContext(context, newIndex, nextChildren.length),
      )

      if (mounted && anchorNode) {
        moveNodes(options, mounted.nodes, container, anchorNode)
      }
    } else {
      const prevIndex = newIndexToOldIndexMap[index] - 1
      const runtime = asRuntimeVNode<HostNode, HostElement, HostFragment>(prevChildren[prevIndex] as VirtualNode)
      const nodes = runtime.handle?.nodes ?? []

      for (const node of nodes) {
        options.insertBefore(container, node, anchorNode)
      }
    }
  }
}

function findUnkeyedMatch(
  target: VirtualNode,
  list: VirtualNodeChild[],
  start: number,
  end: number,
): number | undefined {
  for (let index = start; index <= end; index += 1) {
    const candidate = list[index] as VirtualNode

    if (candidate.key == null && isSameVirtualNode(candidate, target)) {
      return index
    }
  }

  return undefined
}

function unmount<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(options: RendererOptions<HostNode, HostElement, HostFragment>, vnode: VirtualNode): void {
  const runtime = asRuntimeVNode<HostNode, HostElement, HostFragment>(vnode)
  const handle = runtime.handle

  if (handle) {
    handle.teardown()

    return
  }

  if (runtime.el) {
    options.remove(runtime.el)
  }
}

function isSameVirtualNode(a: VirtualNode | undefined, b: VirtualNode | undefined): boolean {
  if (!a || !b) {
    return false
  }

  if (a.type === Text && b.type === Text) {
    return true
  }

  return a.type === b.type && a.key === b.key
}

function moveNodes<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  nodes: HostNode[],
  container: ContainerLike<HostNode, HostElement, HostFragment>,
  anchor: HostNode,
): void {
  for (const node of nodes) {
    options.insertBefore(container, node, anchor)
  }
}

function findNextAnchor<HostNode>(
  children: VirtualNodeChild[],
  startIndex: number,
  fallback: HostNode | undefined,
): HostNode | undefined {
  for (let index = startIndex; index < children.length; index += 1) {
    const runtime = asRuntimeVNode<HostNode>(children[index] as VirtualNode)
    const handle = runtime.handle

    if (handle?.nodes?.length) {
      return handle.nodes[0] as HostNode
    }
  }

  return fallback
}

function hasKeys(children: VirtualNodeChild[]): boolean {
  return children.some((child) => {
    const vnode = child as VirtualNode

    return vnode?.key != null
  })
}

function normalizeMountContext(context?: PatchContext): MountContext {
  return {
    parent: context?.parent,
    appContext: context?.appContext as never,
    shouldUseAnchor: false,
  }
}

function normalizeChildContext(context: PatchContext | undefined, index: number, total: number): MountContext {
  return {
    parent: context?.parent,
    appContext: context?.appContext as never,
    shouldUseAnchor: index < total - 1,
  }
}
