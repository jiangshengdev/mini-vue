/**
 * 组件实例创建与 Devtools 适配：生成实例结构并补全调试字段。
 */
import { getCurrentAppContext } from '../app-context.ts'
import type { MountContext } from '../environment.ts'
import type { ComponentInstance } from './context.ts'
import type { ComponentPropsState } from './props.ts'
import type { SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'
import { effectScope, isRef, toRaw } from '@/reactivity/index.ts'
import type { PlainObject } from '@/shared/index.ts'
import { __DEV__ } from '@/shared/index.ts'

let componentUid = 0

/**
 * 判断 `props` 键是否符合事件监听命名（`onXxx` 且第三位为大写字母）。
 */
function isEmitListenerKey(key: string): boolean {
  if (!key.startsWith('on')) {
    return false
  }

  if (key.length <= 2) {
    return false
  }

  const code = key.codePointAt(2)

  if (code === undefined) {
    return false
  }

  /* 第三个字符为大写字母才视为事件监听（对齐 Vue 的 isOn 语义）。 */
  return code >= 65 && code <= 90
}

/**
 * 从监听器 key（`onXxx`）提取事件名并转为首字母小写。
 */
function normalizeEmitNameFromListenerKey(key: string): string | undefined {
  if (!isEmitListenerKey(key)) {
    return undefined
  }

  const name = key.slice(2)

  if (!name) {
    return undefined
  }

  return name[0].toLowerCase() + name.slice(1)
}

/**
 * 将驼峰事件名转为连字符命名，便于与模板监听名对齐。
 */
function hyphenateEmitName(name: string): string {
  return name.replaceAll(/\B([A-Z])/g, '-$1').toLowerCase()
}

/**
 * 从 `props` 上的监听器推导 Devtools 所需的 `emits` 声明。
 */
function createAutoDeclaredEmitsFromProps(props: unknown): string[] {
  if (!props || typeof props !== 'object') {
    return []
  }

  const rawProps = toRaw(props)

  if (!rawProps || typeof rawProps !== 'object') {
    return []
  }

  const eventNames = new Set<string>()

  for (const [key, value] of Object.entries(rawProps as Record<string, unknown>)) {
    if (value === undefined) {
      continue
    }

    const emitName = normalizeEmitNameFromListenerKey(key)

    if (!emitName) {
      continue
    }

    eventNames.add(hyphenateEmitName(emitName))
  }

  return [...eventNames]
}

/**
 * 将推导出的事件名写回组件类型的 `emits`，仅供 Devtools 去除未声明提示。
 */
function patchComponentTypeEmitsForDevtools(componentType: SetupComponent, props: unknown): void {
  const declaredEmits = createAutoDeclaredEmitsFromProps(props)

  if (declaredEmits.length === 0) {
    return
  }

  const typeWithEmits = componentType as unknown as { emits?: unknown }

  if (!typeWithEmits.emits) {
    typeWithEmits.emits = declaredEmits

    return
  }

  if (Array.isArray(typeWithEmits.emits)) {
    const existing = new Set(
      typeWithEmits.emits.filter((value): value is string => {
        return typeof value === 'string'
      }),
    )

    for (const name of declaredEmits) {
      if (existing.has(name)) {
        continue
      }

      existing.add(name)
      typeWithEmits.emits.push(name)
    }

    return
  }

  if (typeof typeWithEmits.emits === 'object') {
    const emitsRecord = typeWithEmits.emits as Record<string, unknown>

    for (const name of declaredEmits) {
      if (Object.hasOwn(emitsRecord, name)) {
        continue
      }

      emitsRecord[name] = true
    }
  }
}

/**
 * 为组件实例补充 Devtools 兼容字段，确保组件树与 state 正常展示。
 */
function patchComponentInstanceForDevtools<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  parent: ComponentInstance<HostNode, HostElement, HostFragment, T>['parent'],
): void {
  /** Devtools 展示使用的 setupState 代理，提供 proxyRefs 语义。 */
  const createDevtoolsSetupStateProxy = (rawSetupState: PlainObject): PlainObject => {
    /*
     * 对齐 Vue3：setupState 使用 proxyRefs 语义，便于 Devtools 在展示 setup state 时直接得到 `.value`。
     * raw 版本保留在 `devtoolsRawSetupState`，供 Devtools 识别 Ref/Computed/Reactive 类型与编辑回写定位。
     */
    return new Proxy(rawSetupState, {
      get(target, key, receiver) {
        const value: unknown = Reflect.get(target, key, receiver)

        return isRef(value) ? value.value : value
      },
      set(target, key, value, receiver) {
        const previousValue: unknown = Reflect.get(target, key, receiver)

        if (isRef(previousValue) && !isRef(value)) {
          previousValue.value = value

          return true
        }

        return Reflect.set(target, key, value, receiver)
      },
    })
  }

  /*
   * Vue Devtools 兼容字段占位（仅用于 Devtools 读取）。
   *
   * @remarks
   * - Devtools 的内置 `Components` 面板会读取这些字段构建组件树与 state。
   * - 这里统一提供“空对象/指针”以保证不崩溃，它们不参与 mini-vue 运行时语义。
   */
  const devtoolsInstance = instance as unknown as Record<string, unknown>
  const parentRoot = parent ? ((parent as unknown as { root?: unknown }).root ?? parent) : undefined

  devtoolsInstance.root = parentRoot ?? instance
  devtoolsInstance.data ??= {}
  devtoolsInstance.renderContext ??= {}
  devtoolsInstance.devtoolsRawSetupState ??= {}
  devtoolsInstance.setupState = createDevtoolsSetupStateProxy(
    devtoolsInstance.devtoolsRawSetupState as PlainObject,
  )
  devtoolsInstance.attrs ??= {}
  devtoolsInstance.ctx ??= {}
  devtoolsInstance.refs ??= {}

  /*
   * Devtools 会读取 `instance.type.emits` 判断事件监听是否“已声明”。
   *
   * @remarks
   * mini-vue 函数组件没有 `emits` 选项；这里采取更激进的策略：从 props 上的 `onXxx` 监听器反推 emits。
   * 仅用于消除 Devtools 中 “⚠️ Not declared” 的提示，不影响运行时语义。
   */
  patchComponentTypeEmitsForDevtools(instance.type as SetupComponent, instance.propsSource)

  if (!Object.hasOwn(devtoolsInstance, 'vnode')) {
    /*
     * 兼容 Devtools 读取 `instance.vnode.key/props`：将其映射到 mini-vue 的 `instance.virtualNode`。
     *
     * @remarks
     * - Devtools 会用它展示 renderKey 与事件监听等信息。
     * - 只读映射，避免与 mini-vue 的运行时语义耦合。
     */
    Object.defineProperty(devtoolsInstance, 'vnode', {
      get() {
        return (instance as unknown as { virtualNode?: unknown }).virtualNode
      },
      configurable: true,
    })
  }
}

/**
 * 创建组件实例与关联的 `effect` 作用域。
 *
 * @remarks
 * - 实例的 `provides` 通过原型链继承父组件或应用级 `provides`，实现层级依赖注入。
 * - `render`/`effect` 初始为空，由 `setup` 与 `performInitialRender` 回填。
 * - `scope` 用于托管 `setup` 内部创建的所有副作用，卸载时统一 `stop`。
 */
export function createComponentInstance<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  component: T,
  propsState: ComponentPropsState<T>,
  container: HostElement | HostFragment,
  context?: MountContext,
): ComponentInstance<HostNode, HostElement, HostFragment, T> {
  /*
   * 挂载上下文从父到子逐层下传：
   * - `parent`：用于组件树关系、`provide`/`inject` 的原型链继承。
   * - `appContext`：用于「根级 `provides`」的稳定传播（组件外 `app.provide` 的入口）。
   */
  const parent = context?.parent
  const appContext = parent?.appContext ?? context?.appContext ?? getCurrentAppContext()
  const { props, propsSource } = propsState
  const componentName = __DEV__ ? component.name || 'AnonymousComponent' : undefined
  const uid = componentUid++

  /*
   * `provides` 采用原型链：
   * - 优先继承父组件 `provides`
   * - 否则继承 `appContext.provides`（root `provides`）
   * - 再否则回退到空对象（支持无 `createApp`/`render` 的极简场景）
   */
  const providesSource: PlainObject =
    parent?.provides ?? appContext?.provides ?? (Object.create(null) as PlainObject)

  /* `render`/`effect` 初始为空，由 `setup` 与 `performInitialRender` 回填。 */
  const instance: ComponentInstance<HostNode, HostElement, HostFragment, T> = {
    uid,
    postOrderId: 0,
    parent,
    appContext,
    provides: Object.create(providesSource) as PlainObject,
    type: component,
    componentName,
    container,
    props,
    propsSource,
    /**
     * `setup` 阶段会把它替换为真实 `render` 闭包；这里提供占位实现以保持类型稳定。
     */
    render() {
      return undefined
    },
    cleanupTasks: [],
    setupContext: {},
    scope: effectScope(true),
    isMounted: false,
    isUnmounted: false,
    isDeactivated: false,
    mountedHooks: [],
    unmountedHooks: [],
    activatedHooks: [],
    deactivatedHooks: [],
    beforeUpdateHooks: [],
    updatedHooks: [],
  }

  if (__DEV__) {
    patchComponentInstanceForDevtools(instance, parent)
  }

  return instance
}

/**
 * 将实例回写到 `virtualNode`，方便测试或调试阶段访问。
 *
 * @remarks
 * 该函数扩展 `virtualNode` 类型后写入实例引用，供外部消费（如 DevTools）。
 */
export function attachInstanceToVirtualNode<
  HostNode,
  HostElement extends HostNode & WeakKey,
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

  /* 扩展 `virtualNode` 类型后写入实例引用，供外部消费。 */
  ;(virtualNode as VirtualNodeWithInstance).componentInstance = instance
}
