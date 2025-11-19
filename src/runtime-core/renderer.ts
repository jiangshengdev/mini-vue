/**
 * 平台无关的渲染核心定义，通过注入宿主环境能力完成挂载流程。
 */
import type { ComponentResult } from '@/jsx'
import { mountChild } from './renderer/mount-child.ts'

/**
 * 宿主环境需要提供的渲染原语集合。
 */
export interface RendererOptions<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
> {
  /** 根据标签名创建宿主元素节点。 */
  createElement(type: string): HostElement
  /** 创建文本节点，用于渲染字符串与数字。 */
  createText(text: string): HostNode
  /** 创建片段节点，承载一组子节点再整体插入。 */
  createFragment(): HostFragment
  /** 将子节点插入到指定父节点末尾。 */
  appendChild(parent: HostElement | HostFragment, child: HostNode): void
  /** 清空容器内容，在新一轮渲染前使用。 */
  clear(container: HostElement): void
  /**
   * 将 VNode props 映射到真实元素节点。
   * 传入 null 时代表没有任何 props 需要处理。
   */
  patchProps(el: HostElement, props: Record<string, unknown> | null): void
}

/** 根级渲染函数签名，负责将顶层子树挂载到容器。 */
export type RootRenderFunction<HostElement> = (
  vnode: ComponentResult,
  container: HostElement,
) => void

/** 渲染器工厂返回值，包含渲染与清理能力。 */
export interface Renderer<HostNode, HostElement extends HostNode> {
  /** 将 VNode 子树渲染到指定容器中。 */
  render: RootRenderFunction<HostElement>
  /** 清空容器内容并触发宿主层清理。 */
  clear: (container: HostElement) => void
}

/**
 * 创建通用渲染器，通过宿主环境提供的原语完成组件与元素挂载。
 */
export function createRenderer<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
): Renderer<HostNode, HostElement> {
  const { clear } = options

  /* 根渲染函数会先清空容器，再挂载整棵子树。 */
  function render(vnode: ComponentResult, container: HostElement): void {
    clear(container)
    mountChild(options, vnode, container)
  }

  return {
    render,
    clear,
  }
}
