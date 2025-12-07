/**
 * DOM 宿主环境的渲染原语实现。
 */
import { patchProps } from './patch-props.ts'
import type { RendererOptions } from '@/runtime-core/index.ts'

/**
 * DOM 宿主环境完整的渲染原语集合，供 renderer 复用。
 */
export const domRendererOptions: RendererOptions<Node, Element, DocumentFragment> = {
  /** 创建指定标签的 HTMLElement。 */
  createElement(type): HTMLElement {
    return document.createElement(type)
  },
  /** 根据文本内容生成 Text 节点，承载字符串 children。 */
  createText(text): Text {
    return document.createTextNode(text)
  },
  /** 创建片段节点，用于批量插入 children。 */
  createFragment(): DocumentFragment {
    return document.createDocumentFragment()
  },
  /** 按顺序把子节点挂到父节点末尾。 */
  appendChild(parent, child): void {
    parent.append(child)
  },
  /** 在指定锚点前插入子节点，保持原有兄弟顺序。 */
  insertBefore(_parent, child, anchor): void {
    ;(anchor as ChildNode).before(child)
  },
  /** 重置容器文本内容，相当于全量清空。 */
  clear(container): void {
    container.textContent = ''
  },
  /**
   * 将节点从其父容器中移除，兼容文本、元素等所有宿主节点。
   */
  remove(node): void {
    ;(node as ChildNode).remove()
  },
  /** DOM 属性打补丁逻辑，转发到专用实现。 */
  patchProps,
}
