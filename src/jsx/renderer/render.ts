import type { ComponentResult } from '@/jsx/vnode'
import type { MountTarget } from './mount.ts'
import { mountChild } from './mount.ts'

/**
 * 将顶层 VNode 子树渲染到容器中，先清空后完整重绘。
 */
export function render(vnode: ComponentResult, container: MountTarget) {
  /* 清空容器内容，保证每次渲染都是全量覆盖 */
  container.textContent = ''
  /* 复用 mountChild 统一处理各种子节点类型 */
  mountChild(vnode, container)
}
