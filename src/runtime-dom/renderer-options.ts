/**
 * DOM 宿主环境的渲染原语实现。
 */
import type { RendererOptions } from '@/runtime-core'
import { patchProps } from './patch-props.ts'

/**
 * DOM 宿主环境完整的渲染原语集合，供 renderer 复用。
 */
export const domRendererOptions: RendererOptions<
  Node,
  Element,
  DocumentFragment
> = {
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
    parent.appendChild(child)
  },
  /** 重置容器文本内容，相当于全量清空。 */
  clear(container): void {
    container.textContent = ''
  },
  /** DOM 属性打补丁逻辑，转发到专用实现。 */
  patchProps,
}
