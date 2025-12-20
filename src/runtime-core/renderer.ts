/**
 * 平台无关的渲染核心定义，通过注入宿主环境能力完成挂载流程。
 */
import type { AppContext } from './create-app.ts'
import type { MountedHandle } from './mount/index.ts'
import { mountChild } from './mount/index.ts'
import { normalizeRenderOutput } from './normalize.ts'
import type { RenderOutput } from '@/jsx-foundation/index.ts'
import { isVirtualNode } from '@/jsx-foundation/index.ts'
import { runtimeCoreInvalidContainer } from '@/messages/index.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 宿主环境需要提供的渲染原语集合。
 */
export interface RendererOptions<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
> {
  /** 根据标签名创建宿主元素节点。 */
  createElement(type: string): HostElement
  /** 创建文本节点，用于渲染字符串与数字。 */
  createText(text: string): HostNode
  /** 创建片段节点，承载一组子节点再整体插入。 */
  createFragment(): HostFragment
  /** 设置文本节点内容，复用既有宿主节点。 */
  setText(node: HostNode, text: string): void
  /** 将子节点插入到指定父节点末尾。 */
  appendChild(parent: HostElement | HostFragment, child: HostNode): void
  /** 将子节点插入到指定父节点且位于锚点节点之前（`runtime-core` 不会传入 `HostFragment` 作为 `child`）。 */
  insertBefore(parent: HostElement | HostFragment, child: HostNode, anchor?: HostNode): void
  /** 清空容器内容，在新一轮渲染前使用。 */
  clear(container: HostElement): void
  /** 将宿主节点从其父容器中移除。 */
  remove(node: HostNode): void
  /**
   * 将 `virtualNode` `props` 映射到真实元素节点。
   * 传入 `null` 时代表没有任何 `props` 需要处理。
   */
  patchProps(element: HostElement, previousProps?: PropsShape, nextProps?: PropsShape): void
}

/** 根级渲染函数签名，负责将顶层子树挂载到容器。 */
export type RootRenderFunction<HostElement extends WeakKey> = (
  virtualNode: RenderOutput,
  container: HostElement,
) => void

/** 渲染器工厂返回值，包含渲染与清理能力。 */
export interface Renderer<HostNode, HostElement extends HostNode & WeakKey> {
  /**
   * 将 `virtualNode` 子树渲染到指定容器中。
   *
   * @public
   */
  render: RootRenderFunction<HostElement>
  /** 清空容器内容并触发宿主层清理。 */
  clear: (container: HostElement) => void
  /** 卸载指定容器内的渲染树并释放副作用。 */
  unmount: (container: HostElement) => void
}

/**
 * 创建通用渲染器，通过宿主环境提供的原语完成组件与元素挂载。
 */
export function createRenderer<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(options: RendererOptions<HostNode, HostElement, HostFragment>): Renderer<HostNode, HostElement> {
  const { clear } = options
  const mountedHandlesByContainer = new WeakMap<WeakKey, MountedHandle<HostNode>>()

  /**
   * 将宿主容器断言为对象键，便于复用 `WeakMap` 存储。
   */
  function asContainerKey(container: HostElement): WeakKey {
    const isObjectLike = typeof container === 'object' && container !== null
    const isCallable = typeof container === 'function'

    if (isObjectLike || isCallable) {
      return container
    }

    throw new TypeError(runtimeCoreInvalidContainer, { cause: container })
  }

  /**
   * 若容器曾挂载过子树，则执行 `teardown` 并移除缓存。
   */
  function teardownContainer(container: HostElement): void {
    const mounted = mountedHandlesByContainer.get(asContainerKey(container))

    if (mounted) {
      mounted.teardown()
      mountedHandlesByContainer.delete(asContainerKey(container))
    }
  }

  /**
   * 根渲染函数会先清空容器，再挂载整棵子树。
   */
  function render(virtualNode: RenderOutput, container: HostElement): void {
    teardownContainer(container)
    clear(container)
    const normalized = normalizeRenderOutput(virtualNode)
    const normalizedAppContext = isVirtualNode(normalized)
      ? (normalized as { appContext?: AppContext }).appContext
      : undefined
    const rawAppContext = isVirtualNode(virtualNode)
      ? (virtualNode as { appContext?: AppContext }).appContext
      : undefined
    const appContext = normalizedAppContext ?? rawAppContext
    /* `normalize` 返回 `undefined` 时保留原始输出，交由 `mountChild` 触发开发期警告。 */
    const outputToMount: RenderOutput | undefined = normalized ?? virtualNode
    let mounted: MountedHandle<HostNode> | undefined

    if (outputToMount !== undefined) {
      mounted = mountChild(options, outputToMount, {
        container,
        context: { appContext },
      })
    }

    if (mounted) {
      mountedHandlesByContainer.set(asContainerKey(container), mounted)
    }
  }

  /**
   * 卸载操作只负责清理缓存并复用宿主 `clear` 逻辑。
   */
  function unmount(container: HostElement): void {
    teardownContainer(container)
    clear(container)
  }

  return {
    render,
    clear,
    unmount,
  }
}
