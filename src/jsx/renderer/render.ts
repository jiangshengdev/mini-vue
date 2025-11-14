import type { VNodeChild } from '@/jsx/vnode'
import type { MountTarget } from './mount.ts'
import { mountChild } from './mount.ts'

export function render(
  vnode: VNodeChild | VNodeChild[] | null | undefined,
  container: MountTarget,
) {
  container.textContent = ''
  mountChild(vnode, container)
}
