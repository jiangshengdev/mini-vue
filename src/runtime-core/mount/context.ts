import type { AnyComponentInstance } from '../component/context.ts'
import type { AppContext } from '../create-app.ts'

/**
 * 统一挂载链路的上下文参数，避免函数参数过多。
 */
export interface MountContext {
  /** 当前子树是否需要锚点以保持兄弟顺序。 */
  shouldUseAnchor?: boolean
  /** 当前挂载发生在哪个父组件实例下。 */
  parent?: AnyComponentInstance
  /** 当前挂载所属的应用上下文，用于 root provides 的稳定传播。 */
  appContext?: AppContext
}
