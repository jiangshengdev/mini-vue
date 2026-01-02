/**
 * DOM 宿主环境的渲染原语实现，封装节点创建、插入、清理与属性打补丁的操作。
 *
 * 作为 runtime-core 与 DOM 的契约，使渲染器可以复用统一的选项生成 DOM 版 renderer。
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
  /**
   * 创建指定标签的 HTMLElement。
   *
   * @param type - 标签名
   * @returns 新建的元素节点
   */
  createElement(type): HTMLElement {
    return document.createElement(type)
  },
  /**
   * 根据文本内容生成 Text 节点，承载字符串 children。
   *
   * @param text - 文本内容
   * @returns 新建的文本节点
   */
  createText(text): Text {
    return document.createTextNode(text)
  },
  /**
   * 创建注释节点，用于锚点等不可见占位。
   *
   * @param text - 注释内容
   * @returns 新建的注释节点
   */
  createComment(text): Comment {
    return document.createComment(text)
  },
  /**
   * 更新现有文本节点的内容，避免重新创建节点。
   *
   * @param node - 目标文本节点
   * @param text - 新的文本内容
   */
  setText(node, text): void {
    ;(node as Text).nodeValue = text
  },
  /**
   * 创建 DocumentFragment，用于批量插入 children。
   *
   * @returns 新建的片段节点
   */
  createFragment(): DocumentFragment {
    return document.createDocumentFragment()
  },
  /**
   * 将子节点追加到父节点末尾。
   *
   * @param parent - 父节点
   * @param child - 要插入的子节点
   */
  appendChild(parent, child): void {
    parent.append(child)
  },
  /**
   * 在指定锚点前插入子节点。
   *
   * 若锚点不存在，则追加到父节点末尾。
   * 若锚点不是父节点的子节点，抛出 DOMException。
   *
   * @param parent - 父节点
   * @param child - 待插入的子节点
   * @param anchor - 参考锚点
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
  /**
   * 读取指定节点的下一个兄弟节点，用于区间遍历与移动。
   *
   * @param node - 当前节点
   * @returns 下一个兄弟节点或 undefined
   */
  nextSibling(node): Node | undefined {
    return node.nextSibling ?? undefined
  },
  /**
   * 清空容器内所有内容，通过设置 textContent 实现。
   *
   * @param container - 待清空的节点
   */
  clear(container): void {
    container.textContent = ''
  },
  /**
   * 将节点从其父容器中移除，兼容 Text、Element 等所有 ChildNode。
   *
   * @param node - 需要移除的节点
   */
  remove(node): void {
    ;(node as ChildNode).remove()
  },
  /** DOM 属性打补丁，转发到 props 子模块的专用实现。 */
  patchProps,
}
