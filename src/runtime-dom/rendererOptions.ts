/**
 * DOM 宿主环境的渲染原语实现。
 */
import type { RendererOptions } from '@/runtime-core'
import { patchProps } from './patchProps.ts'

export const domRendererOptions: RendererOptions<
  Node,
  Element,
  DocumentFragment
> = {
  createElement(type) {
    return document.createElement(type)
  },
  createText(text) {
    return document.createTextNode(text)
  },
  createFragment() {
    return document.createDocumentFragment()
  },
  appendChild(parent, child) {
    parent.appendChild(child)
  },
  clear(container) {
    container.textContent = ''
  },
  patchProps,
}
