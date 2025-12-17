import { resolveComponentProps } from '../component/props.ts'
import { assignElementRef, resolveElementRefBinding } from '../mount/element.ts'
import type { RendererOptions } from '../renderer.ts'
import { mountChild } from '../mount/index.ts'
import { asRuntimeVNode } from '../vnode.ts'
import type { ContainerLike, PatchContext } from './context.ts'
import { normalizeMountContext } from './context.ts'
import { patchChildren } from './children.ts'
import { isSameVirtualNode, moveNodes, syncRuntimeMetadata, unmount } from './utils.ts'
import type { VirtualNode } from '@/jsx-foundation/index.ts'
import { Fragment, Text } from '@/jsx-foundation/index.ts'

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

    syncRuntimeMetadata(runtimePrev, runtimeNext, { component: undefined })

    if (runtimePrev.el) {
      options.setText(
        runtimePrev.el,
        (next as VirtualNode<typeof Text> & { text?: string }).text ?? '',
      )
    }

    return
  }

  if (next.type === Fragment) {
    const runtimePrev = asRuntimeVNode<HostNode, HostElement, HostFragment>(prev)
    const runtimeNext = asRuntimeVNode<HostNode, HostElement, HostFragment>(next)

    syncRuntimeMetadata(runtimePrev, runtimeNext, { component: undefined })

    patchChildren(
      options,
      prev.children,
      next.children,
      container,
      patchChild,
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

  syncRuntimeMetadata(runtimePrev, runtimeNext, {
    anchor: undefined,
    component: undefined,
  })

  const prevRef = resolveElementRefBinding<HostElement>(prev.props?.ref)
  const nextRef = resolveElementRefBinding<HostElement>(next.props?.ref)

  if (prevRef) {
    assignElementRef(prevRef, undefined)
  }

  options.patchProps(el, prev.props, next.props)
  patchChildren(options, prev.children, next.children, el, patchChild, anchor, context)

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

  syncRuntimeMetadata(runtimePrev, runtimeNext, { component: instance })
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
