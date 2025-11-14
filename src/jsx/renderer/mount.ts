import type {
  ComponentResult,
  ComponentType,
  ElementProps,
  VNode,
  VNodeChild,
} from '@/jsx/vnode'
import { isVNode } from '@/jsx/vnode'
import { applyProps } from './props.ts'

/**
 * 挂载操作可以写入的目标容器类型。
 */
export type MountTarget = Element | DocumentFragment

/**
 * 单次挂载调用返回的真实 DOM 节点类型。
 */
export type MountResult = Node | null

/**
 * 将 JSX 子节点挂载到指定容器，根据不同类型采用不同渲染策略。
 */
export function mountChild(
  child: ComponentResult,
  container: MountTarget,
): MountResult {
  /* 空值（null / undefined）视为不渲染任何内容，直接返回 */
  if (child == null) {
    return null
  }

  /* 数组 children 表示一组兄弟节点，使用 fragment 承载后整体插入 */
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

  /* 原始字符串与数字通过 Text 节点渲染到容器中 */
  if (typeof child === 'string' || typeof child === 'number') {
    const text = document.createTextNode(String(child))
    container.appendChild(text)
    return text
  }

  /* 标准 VNode 交由专门的挂载逻辑处理组件与元素分支 */
  if (isVNode(child)) {
    return mountVNode(child, container)
  }

  /* 其余非常规类型统一转为字符串文本，作为调试友好的兜底行为 */
  const text = document.createTextNode(String(child))
  container.appendChild(text)
  return text
}

/**
 * 挂载单个 VNode，根据 type 判定是函数组件还是原生元素。
 */
function mountVNode(vnode: VNode, container: MountTarget): MountResult {
  /* 函数组件通过执行组件函数拿到子树，再递归挂载 */
  if (typeof vnode.type === 'function') {
    const component = vnode.type as ComponentType
    return mountComponent(
      component,
      vnode as VNode<typeof component>,
      container,
    )
  }

  /* 非函数 type 视为原生标签名，走元素挂载逻辑 */
  return mountElement(vnode.type as string, vnode, container)
}

/**
 * 挂载函数组件：复制 props、补全 children，并挂载组件返回的子树。
 */
function mountComponent<T extends ComponentType>(
  component: T,
  vnode: VNode<T>,
  container: MountTarget,
): MountResult {
  /* 浅拷贝一份 props，避免组件内部直接修改原始 VNode 的 props 对象 */
  const props = (vnode.props ? { ...vnode.props } : {}) as ElementProps<T>
  /* 若 VNode 挂载了 children，将其通过 props.children 传递给组件 */
  if (vnode.children.length > 0) {
    props.children = vnode.children
  }
  /* 调用函数组件得到下一层 JSX 子树，再复用 mountChild 继续递归挂载 */
  const subtree = component(props)
  return mountChild(subtree, container)
}

/**
 * 挂载原生元素节点：创建 DOM 元素、应用 props，并递归挂载其子节点。
 */
function mountElement(
  type: string,
  vnode: VNode,
  container: MountTarget,
): MountResult {
  /* 根据标签名创建对应的原生 DOM 元素，例如 'div'、'span' 等 */
  const el = document.createElement(type)
  /* 将 VNode 上的属性映射到真实 DOM，包括事件、class、style 等 */
  const props = vnode.props as Record<string, unknown> | null
  applyProps(el, props)
  /* 递归挂载当前元素的所有子节点，保持 JSX 中声明的顺序 */
  mountChildren(vnode.children, el)
  container.appendChild(el)
  return el
}

/**
 * 依次将一组子节点挂载到指定元素容器，保持原始顺序不变。
 */
function mountChildren(children: VNodeChild[], container: Element) {
  /* 遍历 children，逐个复用 mountChild 实现统一的挂载策略 */
  for (const child of children) {
    mountChild(child, container)
  }
}
