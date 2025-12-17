import { resolveComponentProps } from '../component/props.ts'
import type { MountContext } from '../mount/context.ts'
import { assignElementRef, resolveElementRefBinding } from '../mount/element.ts'
import { mountChild } from '../mount/index.ts'
import type { RendererOptions } from '../renderer.ts'
import { asRuntimeVNode } from '../vnode.ts'
import { patchChildren } from './children.ts'
import type { ContainerLike, PatchContext } from './context.ts'
import { normalizeMountContext } from './context.ts'
import { isSameVirtualNode, moveNodes, syncRuntimeMetadata, unmount } from './utils.ts'
import type { VirtualNode } from '@/jsx-foundation/index.ts'
import { Fragment, Text } from '@/jsx-foundation/index.ts'

export function patchChild<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previous: VirtualNode | undefined,
  next: VirtualNode | undefined,
  environment: {
    container: ContainerLike<HostNode, HostElement, HostFragment>
    anchor?: HostNode
    context?: PatchContext | MountContext
  },
): void {
  if (previous === next) {
    return
  }

  if (!previous) {
    if (!next) {
      return
    }

    const mounted = mountChild(
      options,
      next,
      environment.container,
      normalizeMountContext(environment.context),
    )

    if (mounted && environment.anchor) {
      moveNodes(options, mounted.nodes, environment.container, environment.anchor)
    }

    return
  }

  if (!next) {
    unmount(options, previous)

    return
  }

  if (isSameVirtualNode(previous, next)) {
    patchExisting(options, previous, next, environment)

    return
  }

  unmount(options, previous)
  const mounted = mountChild(
    options,
    next,
    environment.container,
    normalizeMountContext(environment.context),
  )

  if (mounted && environment.anchor) {
    moveNodes(options, mounted.nodes, environment.container, environment.anchor)
  }
}

function patchExisting<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previous: VirtualNode,
  next: VirtualNode,
  environment: {
    container: ContainerLike<HostNode, HostElement, HostFragment>
    anchor?: HostNode
    context?: PatchContext | MountContext
  },
): void {
  if (next.type === Text) {
    const runtimePrevious = asRuntimeVNode<HostNode, HostElement, HostFragment>(previous)
    const runtimeNext = asRuntimeVNode<HostNode, HostElement, HostFragment>(next)

    syncRuntimeMetadata(runtimePrevious, runtimeNext, { component: undefined })

    if (runtimePrevious.el) {
      options.setText(
        runtimePrevious.el,
        (next as VirtualNode<typeof Text> & { text?: string }).text ?? '',
      )
    }

    return
  }

  if (next.type === Fragment) {
    const runtimePrevious = asRuntimeVNode<HostNode, HostElement, HostFragment>(previous)
    const runtimeNext = asRuntimeVNode<HostNode, HostElement, HostFragment>(next)

    syncRuntimeMetadata(runtimePrevious, runtimeNext, { component: undefined })

    patchChildren(options, previous.children, next.children, {
      container: environment.container,
      patchChild,
      anchor: runtimePrevious.anchor ?? environment.anchor,
      context: environment.context,
    })

    return
  }

  if (typeof next.type === 'function') {
    patchComponent(options, previous, next, environment)

    return
  }

  patchElement(options, previous, next, environment)
}

function patchElement<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previous: VirtualNode,
  next: VirtualNode,
  environment: { anchor?: HostNode; context?: PatchContext | MountContext },
): void {
  const runtimePrevious = asRuntimeVNode<HostNode, HostElement, HostFragment>(previous)
  const runtimeNext = asRuntimeVNode<HostNode, HostElement, HostFragment>(next)
  const element = runtimePrevious.el as HostElement

  syncRuntimeMetadata(runtimePrevious, runtimeNext, {
    anchor: undefined,
    component: undefined,
  })

  const previousRef = resolveElementRefBinding<HostElement>(previous.props?.ref)
  const nextRef = resolveElementRefBinding<HostElement>(next.props?.ref)

  if (previousRef) {
    assignElementRef(previousRef, undefined)
  }

  options.patchProps(element, previous.props, next.props)
  patchChildren(options, previous.children, next.children, {
    container: element,
    patchChild,
    anchor: environment.anchor,
    context: environment.context,
  })

  if (nextRef) {
    assignElementRef(nextRef, element)
  }
}

function patchComponent<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previous: VirtualNode,
  next: VirtualNode,
  environment: {
    container: ContainerLike<HostNode, HostElement, HostFragment>
    anchor?: HostNode
    context?: PatchContext | MountContext
  },
): void {
  const runtimePrevious = asRuntimeVNode<HostNode, HostElement, HostFragment>(previous)
  const runtimeNext = asRuntimeVNode<HostNode, HostElement, HostFragment>(next)
  const instance = runtimePrevious.component

  if (!instance) {
    const mounted = mountChild(
      options,
      next,
      environment.container,
      normalizeMountContext(environment.context),
    )

    if (mounted && environment.anchor) {
      moveNodes(options, mounted.nodes, environment.container, environment.anchor)
    }

    return
  }

  syncRuntimeMetadata(runtimePrevious, runtimeNext, { component: instance })
  instance.props = resolveComponentProps(next as never)
  const runner = instance.effect?.run.bind(instance.effect)

  if (instance.effect?.scheduler && runner) {
    instance.effect.scheduler(runner)
  } else if (runner) {
    const previousSubTree = instance.subTree

    runner()
    patchChild(options, previousSubTree, instance.subTree, environment)
  }
}
