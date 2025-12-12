import type { AnyComponentInstance } from '../component/context.ts'

/**
 * 统一挂载链路的上下文参数，避免函数参数过多。
 */
export interface MountContext {
  /** 当前子树是否需要锚点以保持兄弟顺序。 */
  needsAnchor?: boolean
  /** 当前挂载发生在哪个父组件实例下。 */
  parent?: AnyComponentInstance
}
