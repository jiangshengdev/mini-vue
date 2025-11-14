import type { ComponentType, VNode, VNodeChild } from './vnode.ts'
import { isVNode } from './vnode.ts'

type MountResult = Node | null

type MountTarget = Element | DocumentFragment

export function render(
  vnode: VNodeChild | VNodeChild[] | null | undefined,
  container: MountTarget,
) {
  container.textContent = ''
  mountChild(vnode, container)
}

function mountChild(
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
    return mountComponent(vnode.type as ComponentType, vnode, container)
  }

  return mountElement(vnode.type as string, vnode, container)
}

function mountComponent(
  component: ComponentType,
  vnode: VNode,
  container: MountTarget,
): MountResult {
  const props = vnode.props ? { ...vnode.props } : {}
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

function applyProps(el: Element, props: Record<string, unknown> | null) {
  if (!props) {
    return
  }

  for (const [key, value] of Object.entries(props)) {
    if (key === 'class' || key === 'className') {
      el.className = value == null ? '' : String(value)
      continue
    }

    if (key === 'style') {
      applyStyle(el as HTMLElement, value)
      continue
    }

    if (isEventProp(key) && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase()
      el.addEventListener(eventName, value as EventListener)
      continue
    }

    applyDomProp(el, key, value)
  }
}

function applyStyle(el: HTMLElement, value: unknown) {
  if (value == null || value === false) {
    el.removeAttribute('style')
    return
  }

  if (typeof value === 'string') {
    el.setAttribute('style', value)
    return
  }

  if (typeof value === 'object') {
    for (const [name, styleValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const resolved = styleValue ?? ''
      el.style.setProperty(name, String(resolved))
    }
  }
}

function applyDomProp(el: Element, key: string, value: unknown) {
  if (value == null || value === false) {
    el.removeAttribute(key)
    return
  }

  if (value === true) {
    el.setAttribute(key, '')
    return
  }

  el.setAttribute(key, String(value))
}

function isEventProp(key: string) {
  return key.startsWith('on') && key.length > 2
}
