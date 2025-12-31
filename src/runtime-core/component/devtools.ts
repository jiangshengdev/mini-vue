import type { UnknownComponentInstance } from './context.ts'
import { __DEV__ } from '@/shared/index.ts'

interface VueDevtoolsGlobalHook {
  emit: (event: string, ...payload: unknown[]) => void
}

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

function getDevtoolsAppFromInstance(instance: UnknownComponentInstance): unknown {
  const context = instance.appContext as unknown

  if (!context || typeof context !== 'object') {
    return undefined
  }

  return (context as { app?: unknown }).app
}

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

export function emitDevtoolsComponentAdded(instance: UnknownComponentInstance): void {
  tryEmitComponentEvent('component:added', instance)
}

export function emitDevtoolsComponentUpdated(instance: UnknownComponentInstance): void {
  tryEmitComponentEvent('component:updated', instance)
}

export function emitDevtoolsComponentRemoved(instance: UnknownComponentInstance): void {
  tryEmitComponentEvent('component:removed', instance)
}
