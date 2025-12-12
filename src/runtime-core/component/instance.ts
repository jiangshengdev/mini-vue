import { getCurrentAppContext } from '../app-context.ts'
import type { MountContext } from '../mount/context.ts'
import type { ComponentInstance } from './context.ts'
import type { ElementProps, SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'
import { effectScope } from '@/reactivity/index.ts'
import type { PlainObject } from '@/shared'

/**
 * 创建组件实例与关联的 effect 作用域。
 */
export function createComponentInstance<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  component: T,
  props: ElementProps<T>,
  container: HostElement | HostFragment,
  context?: MountContext,
): ComponentInstance<HostNode, HostElement, HostFragment, T> {
  const parent = context?.parent
  const needsAnchor = context?.needsAnchor ?? false
  const appContext = getCurrentAppContext()
  const providesSource: PlainObject =
    parent?.provides ?? appContext?.provides ?? (Object.create(null) as PlainObject)

  /* `render`/`effect` 初始为空，由 setup 与 performInitialRender 回填。 */
  return {
    parent,
    provides: Object.create(providesSource) as PlainObject,
    type: component,
    container,
    props,
    render() {
      return undefined
    },
    cleanupTasks: [],
    setupContext: {},
    scope: effectScope(true),
    anchor: undefined,
    needsAnchor,
  }
}

/**
 * 将实例回写到 virtualNode，方便测试或调试阶段访问。
 */
export function attachInstanceToVirtualNode<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  virtualNode: VirtualNode<T>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): void {
  type VirtualNodeWithInstance = VirtualNode<T> & {
    /** 收集到的组件实例，方便调试或测试检索。 */
    componentInstance?: ComponentInstance<HostNode, HostElement, HostFragment, T>
  }

  /* 扩展 virtualNode 类型后写入实例引用，供外部消费。 */
  ;(virtualNode as VirtualNodeWithInstance).componentInstance = instance
}
