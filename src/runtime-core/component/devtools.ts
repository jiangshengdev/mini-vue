/**
 * Devtools 兼容层：在开发态向 Vue Devtools 发射组件生命周期事件。
 */
import type { UnknownComponentInstance } from './context.ts'
import { __DEV__ } from '@/shared/index.ts'

interface VueDevtoolsGlobalHook {
  emit: (event: string, ...payload: unknown[]) => void
}

/**
 * 读取全局 Devtools hook（仅开发态有效）。
 */
function getVueDevtoolsGlobalHook(): VueDevtoolsGlobalHook | undefined {
  if (!__DEV__) {
    return undefined
  }

  const globalObject = globalThis as {
    __VUE_DEVTOOLS_GLOBAL_HOOK__?: unknown
  }

  const hook = globalObject.__VUE_DEVTOOLS_GLOBAL_HOOK__

  if (!hook || typeof (hook as { emit?: unknown }).emit !== 'function') {
    return undefined
  }

  return hook as VueDevtoolsGlobalHook
}

/**
 * 从组件实例推导 Devtools 关联的 app 对象。
 */
function getDevtoolsAppFromInstance(instance: UnknownComponentInstance): unknown {
  const context = instance.appContext as unknown

  if (!context || typeof context !== 'object') {
    return undefined
  }

  return (context as { app?: unknown }).app
}

/**
 * 判断 Devtools 是否已为该 app 注册组件记录。
 */
function hasDevtoolsAppRecord(app: unknown): boolean {
  if (!app || typeof app !== 'object') {
    return false
  }

  if (!Object.hasOwn(app as Record<string, unknown>, '__VUE_DEVTOOLS_NEXT_APP_RECORD__')) {
    return false
  }

  return (
    (app as { __VUE_DEVTOOLS_NEXT_APP_RECORD__?: unknown }).__VUE_DEVTOOLS_NEXT_APP_RECORD__ !==
    undefined
  )
}

/**
 * 在 Devtools 已就绪时尝试发射组件相关事件。
 */
function tryEmitComponentEvent(
  event: 'component:added' | 'component:updated' | 'component:removed',
  instance: UnknownComponentInstance,
): void {
  if (!__DEV__) {
    return
  }

  const hook = getVueDevtoolsGlobalHook()

  if (!hook) {
    return
  }

  const app = getDevtoolsAppFromInstance(instance)

  /*
   * `app:init` 触发后 devtools-kit 才会创建 appRecord 并挂到 app 上。
   * 这里用它作为“已接入 Components 插件”的标记，避免首屏 mount 阶段的事件被无意义发射。
   */
  if (!hasDevtoolsAppRecord(app)) {
    return
  }

  const parentUid = instance.parent?.uid

  hook.emit(event, app, instance.uid, parentUid, instance)
}

/**
 * 向 Devtools 发射组件新增事件。
 */
export function emitDevtoolsComponentAdded(instance: UnknownComponentInstance): void {
  tryEmitComponentEvent('component:added', instance)
}

/**
 * 向 Devtools 发射组件更新事件。
 */
export function emitDevtoolsComponentUpdated(instance: UnknownComponentInstance): void {
  tryEmitComponentEvent('component:updated', instance)
}

/**
 * 向 Devtools 发射组件移除事件。
 */
export function emitDevtoolsComponentRemoved(instance: UnknownComponentInstance): void {
  tryEmitComponentEvent('component:removed', instance)
}
