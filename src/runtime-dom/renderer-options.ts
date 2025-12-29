/**
 * DOM 宿主环境的渲染原语实现。
 *
 * 本模块提供 runtime-core 所需的 DOM 操作原语，包括：
 * - 节点创建：`createElement`、`createText`、`createComment`、`createFragment`
 * - 节点操作：`appendChild`、`insertBefore`、`remove`、`clear`
 * - 文本/注释更新：`setText`
 * - 属性打补丁：`patchProps`
 *
 * 这些原语构成 runtime-core 与 DOM 宿主之间的契约，
 * 使渲染器可以在不同宿主环境（如 DOM、Canvas、Native）间复用。
 */
import { patchProps } from './props/index.ts'
import type { RendererOptions } from '@/runtime-core/index.ts'

/**
 * DOM 宿主环境完整的渲染原语集合。
 *
 * 实现 `RendererOptions` 接口，供 `createRenderer` 创建 DOM 渲染器。
 * 泛型参数：
 * - `Node`：所有 DOM 节点的基类
 * - `Element`：DOM 元素节点
 * - `DocumentFragment`：DOM 片段节点
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
  /** 创建注释节点，用于锚点等不可见占位。 */
  createComment(text): Comment {
    return document.createComment(text)
  },
  /** 更新现有文本节点的内容，避免重新创建节点。 */
  setText(node, text): void {
    ;(node as Text).nodeValue = text
  },
  /** 创建 DocumentFragment，用于批量插入 children。 */
  createFragment(): DocumentFragment {
    return document.createDocumentFragment()
  },
  /** 将子节点追加到父节点末尾。 */
  appendChild(parent, child): void {
    parent.append(child)
  },
  /**
   * 在指定锚点前插入子节点。
   *
   * 若锚点不存在，则追加到父节点末尾。
   * 若锚点不是父节点的子节点，抛出 DOMException。
   */
  insertBefore(parent, child, anchor?): void {
    if (!anchor) {
      parent.append(child)

      return
    }

    const anchorNode = anchor as ChildNode

    if (anchorNode.parentNode !== parent) {
      throw new DOMException(
        'Failed to execute insertBefore: The node before which the new node is to be inserted is not a child of this node.',
        'NotFoundError',
      )
    }

    anchorNode.before(child)
  },
  /** 读取指定节点的下一个兄弟节点，用于区间遍历与移动。 */
  nextSibling(node): Node | undefined {
    return node.nextSibling ?? undefined
  },
  /** 清空容器内所有内容，通过设置 textContent 实现。 */
  clear(container): void {
    container.textContent = ''
  },
  /** 将节点从其父容器中移除，兼容 Text、Element 等所有 ChildNode。 */
  remove(node): void {
    ;(node as ChildNode).remove()
  },
  /** DOM 属性打补丁，转发到 props 子模块的专用实现。 */
  patchProps,
}
