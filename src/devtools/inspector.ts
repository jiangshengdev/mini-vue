import type { MiniVueDevtoolsAppShim } from './app-shim.ts'
import type { VueDevtoolsGlobalHook } from './hook.ts'

interface DevtoolsPluginDescriptor {
  id: string
  label: string
  app: MiniVueDevtoolsAppShim
  packageName?: string
  homepage?: string
  logo?: string
}

interface InspectorNode {
  id: string
  label: string
  children?: InspectorNode[]
}

interface InspectorStateItem {
  key: string
  value: unknown
  editable?: boolean
}

type CustomInspectorState = Record<string, InspectorStateItem[]>

interface GetInspectorTreePayload {
  app: unknown
  inspectorId: string
  filter?: string
  rootNodes: InspectorNode[]
}

interface GetInspectorStatePayload {
  app: unknown
  inspectorId: string
  nodeId: string
  state?: CustomInspectorState
}

interface DevtoolsPluginApi {
  addInspector: (options: {
    id: string
    label: string
    icon?: string
    treeFilterPlaceholder?: string
    stateFilterPlaceholder?: string
    noSelectionText?: string
  }) => void
  sendInspectorTree: (inspectorId: string) => void
  sendInspectorState: (inspectorId: string) => void
  selectInspectorNode: (inspectorId: string, nodeId: string) => void
  on: {
    getInspectorTree: (handler: (payload: GetInspectorTreePayload) => void | Promise<void>) => void
    getInspectorState: (
      handler: (payload: GetInspectorStatePayload) => void | Promise<void>,
    ) => void
  }
}

const registeredApps = new WeakSet()
const miniVueInspectorId = 'mini-vue'
const helloNodeId = 'hello'
const helloMessage = 'Hello World'

function createMiniVueLogo(): string {
  /**
   * 作为 devtools 插件 logo 的最小占位图标。
   *
   * @remarks
   * - Vue Devtools 客户端仅把 `/` 或 `http(s)://` 识别为图片 URL（`data:` URL 会被当成 class 使用，导致左侧导航不显示图标）。
   * - 图标来源：`public/material-design-icons/dashboard/materialiconsoutlined/24px.svg`（通过 GitHub Raw 以 https URL 形式提供）。
   */
  return 'https://raw.githubusercontent.com/jiangshengdev/mini-vue/main/public/material-design-icons/dashboard/materialiconsoutlined/24px.svg'
}

function isWeakKey(value: unknown): value is WeakKey {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function createHelloWorldInspectorState(): CustomInspectorState {
  return {
    hello: [
      {
        key: 'message',
        value: helloMessage,
        editable: false,
      },
    ],
  }
}

function createHelloWorldInspectorTree(): InspectorNode[] {
  return [
    {
      id: helloNodeId,
      label: helloMessage,
    },
  ]
}

/**
 * 以 Pinia 风格注册一个最小的自定义 Inspector：
 * - 左侧树：仅 1 个节点（Hello World）
 * - 右侧 state：展示 message = Hello World
 *
 * @remarks
 * - 不依赖 SFC 运行时编译，因此不会触发 Chrome 扩展的 CSP `unsafe-eval` 限制。
 * - 仅依赖 devtools 后端注入的 `__VUE_DEVTOOLS_GLOBAL_HOOK__` 通道。
 */
export function registerMiniVueDevtoolsInspector(options: {
  hook: VueDevtoolsGlobalHook
  app: MiniVueDevtoolsAppShim
}): void {
  if (!isWeakKey(options.app)) {
    return
  }

  if (registeredApps.has(options.app)) {
    return
  }

  registeredApps.add(options.app)

  const descriptor: DevtoolsPluginDescriptor = {
    id: miniVueInspectorId,
    label: 'Mini Vue',
    app: options.app,
    packageName: 'mini-vue',
    logo: createMiniVueLogo(),
    homepage: 'https://github.com/jiangshengdev/mini-vue',
  }

  const setupFn = (api: DevtoolsPluginApi) => {
    api.addInspector({
      id: miniVueInspectorId,
      label: 'Mini Vue',
      icon: 'dashboard',
      treeFilterPlaceholder: '搜索（占位）',
      stateFilterPlaceholder: '过滤（占位）',
      noSelectionText: '请选择左侧节点',
    })

    api.on.getInspectorTree((payload) => {
      if (payload.app !== options.app || payload.inspectorId !== miniVueInspectorId) {
        return
      }

      payload.rootNodes = createHelloWorldInspectorTree()
    })

    api.on.getInspectorState((payload) => {
      if (payload.app !== options.app || payload.inspectorId !== miniVueInspectorId) {
        return
      }

      payload.state = createHelloWorldInspectorState()
    })

    api.sendInspectorTree(miniVueInspectorId)
    api.selectInspectorNode(miniVueInspectorId, helloNodeId)
    api.sendInspectorState(miniVueInspectorId)
  }

  options.hook.emit('devtools-plugin:setup', descriptor, setupFn)
}
