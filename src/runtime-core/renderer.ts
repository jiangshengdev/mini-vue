/**
 * 平台无关的渲染核心定义，通过注入宿主环境能力完成挂载流程。
 */
import type {
  ComponentResult,
  ComponentType,
  ElementProps,
  VNode,
  VNodeChild,
} from '@/jsx/vnode'
import { isVNode } from '@/jsx/vnode'

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
  const {
    createElement,
    createText,
    createFragment,
    appendChild,
    clear,
    patchProps,
  } = options

  function render(vnode: ComponentResult, container: HostElement): void {
    clear(container)
    mountChild(vnode, container)
  }

  function mountChild(
    child: ComponentResult,
    container: HostElement | HostFragment,
  ): HostNode | null {
    if (child == null || typeof child === 'boolean') {
      return null
    }

    if (Array.isArray(child)) {
      const fragment = createFragment()

      for (const item of child) {
        const node = mountChild(item, fragment)

        if (node) {
          appendChild(fragment, node)
        }
      }

      appendChild(container, fragment)

      return fragment
    }

    if (typeof child === 'string' || typeof child === 'number') {
      const text = createText(String(child))

      appendChild(container, text)

      return text
    }

    if (isVNode(child)) {
      return mountVNode(child, container)
    }

    const text = createText(String(child))

    appendChild(container, text)

    return text
  }

  function mountVNode(
    vnode: VNode,
    container: HostElement | HostFragment,
  ): HostNode | null {
    if (typeof vnode.type === 'function') {
      const component = vnode.type as ComponentType

      return mountComponent(component, vnode as VNode<ComponentType>, container)
    }

    return mountElement(vnode.type, vnode, container)
  }

  function mountComponent<T extends ComponentType>(
    component: T,
    vnode: VNode<T>,
    container: HostElement | HostFragment,
  ): HostNode | null {
    const props = (vnode.props ? { ...vnode.props } : {}) as ElementProps<T>
    const childCount = vnode.children.length

    if (childCount === 1) {
      props.children = vnode.children[0]
    } else if (childCount > 1) {
      props.children = vnode.children
    }

    const subtree = component(props)

    return mountChild(subtree, container)
  }

  function mountElement(
    type: string,
    vnode: VNode,
    container: HostElement | HostFragment,
  ): HostNode {
    const el = createElement(type)
    const props = (vnode.props as Record<string, unknown> | null) ?? null

    patchProps(el, props)
    mountChildren(vnode.children, el)
    appendChild(container, el)

    return el
  }

  function mountChildren(children: VNodeChild[], container: HostElement): void {
    for (const child of children) {
      mountChild(child, container)
    }
  }

  return {
    render,
    clear,
  }
}
