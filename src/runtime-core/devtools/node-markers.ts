/**
 * Devtools DOM 标记写入：为宿主节点挂载 `__vueParentComponent` 与 `__vnode`。
 *
 * @remarks
 * - 仅在开发态且检测到 `__VUE_DEVTOOLS_GLOBAL_HOOK__` 时启用，避免纯开发态额外开销。
 * - 仅对 DOM Node（具备 `nodeType`）写入，避免污染非 DOM 宿主实现。
 */
import type { UnknownComponentInstance } from '../component/context.ts'
import { __DEV__ } from '@/shared/index.ts'

interface VueDevtoolsGlobalHookLike {
  emit?: unknown
}

let cachedHook: unknown
let cachedHookEnabled = false

interface DomNodeLike {
  nodeType: number
}

function isDomNode(value: unknown): value is DomNodeLike & Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as DomNodeLike).nodeType === 'number'
  )
}

function isVueDevtoolsHookDetected(): boolean {
  if (!__DEV__) {
    return false
  }

  const currentHook = (globalThis as { __VUE_DEVTOOLS_GLOBAL_HOOK__?: unknown })
    .__VUE_DEVTOOLS_GLOBAL_HOOK__

  if (currentHook === cachedHook) {
    return cachedHookEnabled
  }

  cachedHook = currentHook
  cachedHookEnabled =
    Boolean(currentHook) && typeof (currentHook as VueDevtoolsGlobalHookLike).emit === 'function'

  return cachedHookEnabled
}

function defineDevtoolsProperty(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (Object.hasOwn(target, key)) {
    target[key] = value

    return
  }

  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: false,
    writable: true,
    value,
  })
}

export function setDevtoolsNodeMarkers(options: {
  node: unknown
  vnode?: unknown
  parent?: UnknownComponentInstance
}): void {
  if (!__DEV__) {
    return
  }

  if (!isVueDevtoolsHookDetected()) {
    return
  }

  if (!isDomNode(options.node)) {
    return
  }

  if (options.parent !== undefined) {
    defineDevtoolsProperty(options.node, '__vueParentComponent', options.parent)
  }

  if (options.vnode !== undefined) {
    defineDevtoolsProperty(options.node, '__vnode', options.vnode)
  }
}
