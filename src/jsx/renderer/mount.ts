import type {
  ComponentType,
  ElementProps,
  VNode,
  VNodeChild,
} from '@/jsx/vnode'
import { isVNode } from '@/jsx/vnode'
import { applyProps } from './props.ts'

export type MountTarget = Element | DocumentFragment
export type MountResult = Node | null

export function mountChild(
  child: VNodeChild | VNodeChild[] | null | undefined,
  container: MountTarget,
): MountResult {
  if (child == null) {
    return null
  }

  if (Array.isArray(child)) {
    const fragment = document.createDocumentFragment()
    for (const item of child) {
      const node = mountChild(item, fragment)
      if (node) {
        fragment.appendChild(node)
      }
    }
    container.appendChild(fragment)
    return fragment
  }

  if (typeof child === 'string' || typeof child === 'number') {
    const text = document.createTextNode(String(child))
    container.appendChild(text)
    return text
  }

  if (isVNode(child)) {
    return mountVNode(child, container)
  }

  const text = document.createTextNode(String(child))
  container.appendChild(text)
  return text
}

function mountVNode(vnode: VNode, container: MountTarget): MountResult {
  if (typeof vnode.type === 'function') {
    const component = vnode.type as ComponentType
    return mountComponent(
      component,
      vnode as VNode<typeof component>,
      container,
    )
  }

  return mountElement(vnode.type as string, vnode, container)
}

function mountComponent<T extends ComponentType>(
  component: T,
  vnode: VNode<T>,
  container: MountTarget,
): MountResult {
  const props = (vnode.props ? { ...vnode.props } : {}) as ElementProps<T>
  if (vnode.children.length > 0) {
    props.children = vnode.children
  }
  const subtree = component(props)
  return mountChild(
    subtree as VNodeChild | VNodeChild[] | null | undefined,
    container,
  )
}

function mountElement(
  type: string,
  vnode: VNode,
  container: MountTarget,
): MountResult {
  const el = document.createElement(type)
  applyProps(el, vnode.props)
  mountChildren(vnode.children, el)
  container.appendChild(el)
  return el
}

function mountChildren(children: VNodeChild[], container: Element) {
  for (const child of children) {
    mountChild(child, container)
  }
}
