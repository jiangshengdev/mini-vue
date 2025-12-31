import { miniVueDevtoolsAppVersion } from './constants.ts'
import { Comment, Fragment, Text } from '@/jsx-foundation/index.ts'

export interface MiniVueDevtoolsAppInitPayload {
  app: MiniVueDevtoolsAppShim
  version: string
  types: Record<string, unknown>
}

interface MiniVueDevtoolsVnodeShim {
  type?: unknown
  el?: Node
  children?: unknown[]
  component?: unknown
}

interface MiniVueDevtoolsAppContextShim {
  /** 仅用于 Devtools 读取，模拟 Vue3 `appContext.app` 结构。 */
  app: MiniVueDevtoolsAppShim
  /** 仅用于 Devtools 推断组件名，模拟 Vue3 `appContext.components`。 */
  components?: Record<string, unknown>
  /** 仅用于 Devtools 读取：Vue3 `appContext.mixins`，用于 merged options 计算。 */
  mixins: unknown[]
}

interface MiniVueDevtoolsComponentInstanceShim {
  uid: number
  type: { name?: string }
  parent?: MiniVueDevtoolsComponentInstanceShim
  root: MiniVueDevtoolsComponentInstanceShim
  appContext: MiniVueDevtoolsAppContextShim
  subTree: MiniVueDevtoolsVnodeShim
  vnode?: { key?: unknown; props?: Record<string, unknown> }
  isUnmounted: boolean
  /**
   * 以下字段为 Vue Devtools 兼容占位（仅用于 Devtools 读取）。
   *
   * @remarks
   * - Devtools 的组件 inspector 会在读取实例 state 时访问这些字段。
   * - 这里统一提供“空对象/空数组”，避免 Devtools 后端因缺失字段而报错。
   * - 它们不参与 mini-vue 运行时语义。
   */
  props: Record<string, unknown>
  data: Record<string, unknown>
  renderContext: Record<string, unknown>
  setupState: Record<string, unknown>
  devtoolsRawSetupState: Record<string, unknown>
  attrs: Record<string, unknown>
  provides: Record<PropertyKey, unknown>
  ctx: Record<PropertyKey, unknown>
  refs: Record<string, unknown>
}

export interface MiniVueDevtoolsAppShim {
  /**
   * Vue Devtools 兼容字段（仅用于 Devtools 读取）。
   *
   * @remarks
   * - Devtools 会在 `app:init` 时读取 `_instance/_component/_container` 等字段构建 app record。
   * - 该字段不参与 mini-vue 运行时语义，仅用于避免 Devtools 后端读取时报错。
   */
  _instance: MiniVueDevtoolsComponentInstanceShim
  /** Vue Devtools 兼容字段（仅用于 Devtools 读取）。 */
  _container?: Element
  /** Vue Devtools 兼容字段（仅用于 Devtools 读取）。 */
  _component?: { name?: string }
  /** Vue Devtools 兼容字段（仅用于 Devtools 读取）。 */
  config: { globalProperties: Record<string, unknown> }
}

function resolveDomContainer(target: unknown): Element | undefined {
  if (typeof document === 'undefined') {
    return undefined
  }

  if (typeof target === 'string') {
    return document.querySelector(target) ?? undefined
  }

  return target instanceof Element ? target : undefined
}

function createRootInstanceShim(
  app: MiniVueDevtoolsAppShim,
  container?: Element,
): MiniVueDevtoolsComponentInstanceShim {
  const rootNode = container?.firstChild ?? container

  const instance: Omit<MiniVueDevtoolsComponentInstanceShim, 'root'> & {
    root?: MiniVueDevtoolsComponentInstanceShim
  } = {
    uid: 0,
    type: { name: 'MiniVueRoot' },
    appContext: {
      app,
      components: {},
      mixins: [],
    },
    subTree: {
      el: rootNode ?? undefined,
      children: [],
    },
    vnode: { key: undefined },
    isUnmounted: false,
    props: {},
    data: {},
    renderContext: {},
    setupState: {},
    devtoolsRawSetupState: {},
    attrs: {},
    provides: {},
    ctx: {},
    refs: {},
  }

  instance.root = instance as MiniVueDevtoolsComponentInstanceShim

  return instance as MiniVueDevtoolsComponentInstanceShim
}

export function createMiniVueDevtoolsAppInitPayload(options: {
  mountTarget: unknown
}): MiniVueDevtoolsAppInitPayload {
  const container = resolveDomContainer(options.mountTarget)

  const app = {
    _instance: undefined as unknown as MiniVueDevtoolsComponentInstanceShim,
    _container: container,
    _component: { name: 'MiniVueApp' },
    config: { globalProperties: {} },
  } satisfies Omit<MiniVueDevtoolsAppShim, '_instance'> & {
    _instance: MiniVueDevtoolsComponentInstanceShim
  }

  app._instance = createRootInstanceShim(app, container)

  const fragmentTypeKey = 'Fragment'
  const textTypeKey = 'Text'
  const commentTypeKey = 'Comment'

  const types: Record<string, unknown> = {
    [fragmentTypeKey]: Fragment,
    [textTypeKey]: Text,
    [commentTypeKey]: Comment,
  }

  return {
    app,
    version: miniVueDevtoolsAppVersion,
    types,
  }
}
