export type VueDevtoolsHookEvent = 'app:init' | 'app:unmount' | 'devtools-plugin:setup'

export interface VueDevtoolsGlobalHook {
  emit: (event: VueDevtoolsHookEvent | string, ...payload: unknown[]) => void
  apps?: unknown[]
}

export function getVueDevtoolsGlobalHook(): VueDevtoolsGlobalHook | undefined {
  const globalObject = globalThis as {
    __VUE_DEVTOOLS_GLOBAL_HOOK__?: unknown
  }

  const hook = globalObject.__VUE_DEVTOOLS_GLOBAL_HOOK__

  if (!hook) {
    return undefined
  }

  if (typeof (hook as { emit?: unknown }).emit !== 'function') {
    return undefined
  }

  return hook as VueDevtoolsGlobalHook
}

export function emitVueDevtoolsAppInit(options: {
  hook: VueDevtoolsGlobalHook
  app: unknown
  version: string
  types: Record<string, unknown>
}): void {
  options.hook.emit('app:init', options.app, options.version, options.types)
}

export function emitVueDevtoolsAppUnmount(options: {
  hook: VueDevtoolsGlobalHook
  app: unknown
}): void {
  options.hook.emit('app:unmount', options.app)
}
