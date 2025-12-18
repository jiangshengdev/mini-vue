import type { NormalizedVirtualNode } from '../normalize.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'
import { Fragment, Text } from '@/jsx-foundation/index.ts'

/** 具名的文本 vnode 形态，补充可选 text 字段以匹配运行时数据。 */
export type NormalizedTextVirtualNode = NormalizedVirtualNode<typeof Text> & { text?: string }

/** 判断当前 vnode 是否为文本节点。 */
export function isTextVirtualNode(
  vnode: NormalizedVirtualNode,
): vnode is NormalizedTextVirtualNode {
  return vnode.type === Text
}

/** 具名的组件 vnode 形态，方便在 patch 时区分函数组件。 */
export type NormalizedComponentVirtualNode = NormalizedVirtualNode<SetupComponent>

/** 判断当前 vnode 是否为组件节点（已排除 Fragment/Text）。 */
export function isComponentVirtualNode(
  vnode: NormalizedVirtualNode,
): vnode is NormalizedComponentVirtualNode {
  return typeof vnode.type === 'function' && vnode.type !== Fragment
}
