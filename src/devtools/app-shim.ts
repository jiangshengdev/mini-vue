import { miniVueDevtoolsAppVersion } from './constants.ts'
import { Comment, Fragment, Text } from '@/jsx-foundation/index.ts'

export interface MiniVueDevtoolsAppInitPayload {
  app: MiniVueDevtoolsAppShim
  version: string
  types: Record<string, unknown>
}

interface MiniVueDevtoolsVNodeShim {
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
}

interface MiniVueDevtoolsComponentInstanceShim {
  uid: number
  type: { name?: string }
  parent?: MiniVueDevtoolsComponentInstanceShim
  root: MiniVueDevtoolsComponentInstanceShim
  appContext: MiniVueDevtoolsAppContextShim
  subTree: MiniVueDevtoolsVNodeShim
  vnode?: { key?: unknown }
  isUnmounted: boolean
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

function createRootInstanceShim(app: MiniVueDevtoolsAppShim, container?: Element): MiniVueDevtoolsComponentInstanceShim {
  const rootNode = container?.firstChild ?? container

  const instance = {
    uid: 0,
    type: { name: 'MiniVueRoot' },
    appContext: {
      app,
      components: Object.create(null) as Record<string, unknown>,
    },
    subTree: {
      el: rootNode ?? undefined,
      children: [],
    },
    vnode: { key: undefined },
    isUnmounted: false,
  } as Omit<MiniVueDevtoolsComponentInstanceShim, 'root'> & { root?: MiniVueDevtoolsComponentInstanceShim }

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
    config: { globalProperties: Object.create(null) as Record<string, unknown> },
  } satisfies Omit<MiniVueDevtoolsAppShim, '_instance'> & {
    _instance: MiniVueDevtoolsComponentInstanceShim
  }

  app._instance = createRootInstanceShim(app, container)

  return {
    app,
    version: miniVueDevtoolsAppVersion,
    types: {
      Fragment,
      Text,
      Comment,
    },
  }
}

