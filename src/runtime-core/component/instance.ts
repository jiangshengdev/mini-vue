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
  /*
   * 挂载上下文从父到子逐层下传：
   * - parent：用于组件树关系、provide/inject 的原型链继承。
   * - appContext：用于“根级 provides”的稳定传播（组件外 app.provide 的入口）。
   */
  const parent = context?.parent
  const shouldUseAnchor = context?.shouldUseAnchor ?? false
  const appContext = parent?.appContext ?? context?.appContext ?? getCurrentAppContext()

  /*
   * provides 采用原型链：
   * - 优先继承父组件 provides
   * - 否则继承 appContext.provides（root provides）
   * - 再否则回退到空对象（支持无 createApp/render 的极简场景）
   */
  const providesSource: PlainObject =
    parent?.provides ?? appContext?.provides ?? (Object.create(null) as PlainObject)

  /* `render`/`effect` 初始为空，由 setup 与 performInitialRender 回填。 */
  return {
    parent,
    appContext,
    provides: Object.create(providesSource) as PlainObject,
    type: component,
    container,
    props,
    /**
     * setup 阶段会把它替换为真实 render 闭包；这里提供占位实现以保持类型稳定。
     */
    render() {
      return undefined
    },
    cleanupTasks: [],
    setupContext: {},
    scope: effectScope(true),
    anchor: undefined,
    shouldUseAnchor,
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
