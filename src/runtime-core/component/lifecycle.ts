import type { SchedulerJob } from '../scheduler.ts'
import { disposeSchedulerJob, isSchedulerFlushing, queuePostFlushCb } from '../scheduler.ts'
import type { LifecycleHook, UnknownComponentInstance } from './context.ts'
import {
  getCurrentInstance,
  getCurrentSetupInstance,
  setCurrentInstanceForHook,
  unsetCurrentInstance,
} from './context.ts'
import {
  runtimeCoreOnActivatedOutsideSetup,
  runtimeCoreOnBeforeUpdateOutsideSetup,
  runtimeCoreOnDeactivatedOutsideSetup,
  runtimeCoreOnMountedOutsideSetup,
  runtimeCoreOnUnmountedOutsideSetup,
  runtimeCoreOnUpdatedOutsideSetup,
} from '@/messages/index.ts'
import { withoutTracking } from '@/reactivity/index.ts'
import { __DEV__, errorContexts, errorPhases, runSilent } from '@/shared/index.ts'

type LifecycleHookType = 'mounted' | 'unmounted' | 'beforeUpdate' | 'updated' | 'activated' | 'deactivated'

type HookStorageKey =
  | 'mountedHooks'
  | 'unmountedHooks'
  | 'beforeUpdateHooks'
  | 'updatedHooks'
  | 'activatedHooks'
  | 'deactivatedHooks'

let componentPostOrderId = 0

function resolveHookPhase() {
  return isSchedulerFlushing() ? errorPhases.async : errorPhases.sync
}

function resolveHookMeta(instance: UnknownComponentInstance, hook: LifecycleHookType) {
  if (!__DEV__) {
    return undefined
  }

  return {
    hook,
    componentName: instance.componentName,
    uid: instance.uid,
  }
}

function invokeHook(
  instance: UnknownComponentInstance,
  hook: LifecycleHook,
  type: LifecycleHookType,
): void {
  withoutTracking(() => {
    runSilent(hook, {
      origin: errorContexts.componentLifecycleHook,
      handlerPhase: resolveHookPhase(),
      meta: resolveHookMeta(instance, type),
      beforeRun() {
        setCurrentInstanceForHook(instance)
      },
      afterRun() {
        unsetCurrentInstance()
      },
    })
  })
}

function invokeHooks(
  instance: UnknownComponentInstance,
  hooks: LifecycleHook[],
  type: LifecycleHookType,
): void {
  for (const hook of hooks) {
    invokeHook(instance, hook, type)
  }
}

function injectLifecycleHook(key: HookStorageKey, hook: LifecycleHook, message: string): void {
  const instance = getCurrentSetupInstance()

  if (!instance) {
    throw new Error(message, { cause: { currentInstance: getCurrentInstance() } })
  }

  instance[key].push(hook)
}

export function onMounted(hook: LifecycleHook): void {
  injectLifecycleHook('mountedHooks', hook, runtimeCoreOnMountedOutsideSetup)
}

export function onUnmounted(hook: LifecycleHook): void {
  injectLifecycleHook('unmountedHooks', hook, runtimeCoreOnUnmountedOutsideSetup)
}

export function onActivated(hook: LifecycleHook): void {
  injectLifecycleHook('activatedHooks', hook, runtimeCoreOnActivatedOutsideSetup)
}

export function onDeactivated(hook: LifecycleHook): void {
  injectLifecycleHook('deactivatedHooks', hook, runtimeCoreOnDeactivatedOutsideSetup)
}

export function onBeforeUpdate(hook: LifecycleHook): void {
  injectLifecycleHook('beforeUpdateHooks', hook, runtimeCoreOnBeforeUpdateOutsideSetup)
}

export function onUpdated(hook: LifecycleHook): void {
  injectLifecycleHook('updatedHooks', hook, runtimeCoreOnUpdatedOutsideSetup)
}

export function invalidateLifecyclePostJobs(instance: UnknownComponentInstance): void {
  disposeSchedulerJob(instance.mountedHookJob)
  disposeSchedulerJob(instance.activatedHookJob)
  disposeSchedulerJob(instance.updatedHookJob)
  disposeSchedulerJob(instance.deactivatedHookJob)
  instance.mountedHookJob = undefined
  instance.activatedHookJob = undefined
  instance.updatedHookJob = undefined
  instance.deactivatedHookJob = undefined
}

export function markComponentMounted(instance: UnknownComponentInstance): void {
  if (instance.postOrderId !== 0) {
    return
  }

  componentPostOrderId += 1
  instance.postOrderId = componentPostOrderId
}

export function queueMountedHooks(instance: UnknownComponentInstance): void {
  if (instance.isUnmounted || instance.mountedHooks.length === 0) {
    return
  }

  instance.mountedHookJob ??= (() => {
    const job: SchedulerJob = () => {
      instance.mountedHookJob = undefined

      if (instance.isUnmounted) {
        return
      }

      invokeHooks(instance, instance.mountedHooks, 'mounted')
    }

    job.id = instance.postOrderId

    return job
  })()

  queuePostFlushCb(instance.mountedHookJob)
}

export function queueActivatedHooks(instance: UnknownComponentInstance): void {
  if (instance.isUnmounted || instance.activatedHooks.length === 0) {
    return
  }

  disposeSchedulerJob(instance.deactivatedHookJob)
  instance.deactivatedHookJob = undefined

  instance.activatedHookJob ??= (() => {
    const job: SchedulerJob = () => {
      instance.activatedHookJob = undefined

      if (instance.isUnmounted || instance.isDeactivated) {
        return
      }

      invokeHooks(instance, instance.activatedHooks, 'activated')
    }

    job.id = instance.postOrderId

    return job
  })()

  queuePostFlushCb(instance.activatedHookJob)
}

export function invokeBeforeUpdateHooks(instance: UnknownComponentInstance): void {
  if (instance.isUnmounted || instance.beforeUpdateHooks.length === 0) {
    return
  }

  invokeHooks(instance, instance.beforeUpdateHooks, 'beforeUpdate')
}

export function queueUpdatedHooks(instance: UnknownComponentInstance): void {
  if (instance.isUnmounted || !instance.isMounted || instance.updatedHooks.length === 0) {
    return
  }

  instance.updatedHookJob ??= (() => {
    const job: SchedulerJob = () => {
      instance.updatedHookJob = undefined

      if (instance.isUnmounted) {
        return
      }

      invokeHooks(instance, instance.updatedHooks, 'updated')
    }

    job.id = instance.postOrderId

    return job
  })()

  queuePostFlushCb(instance.updatedHookJob)
}

export function queueUnmountedHooks(instance: UnknownComponentInstance): void {
  if (!instance.isMounted || instance.unmountedHooks.length === 0) {
    return
  }

  instance.unmountedHookJob ??= (() => {
    const job: SchedulerJob = () => {
      instance.unmountedHookJob = undefined
      invokeHooks(instance, instance.unmountedHooks, 'unmounted')
    }

    job.id = instance.postOrderId

    return job
  })()

  queuePostFlushCb(instance.unmountedHookJob)
}

export function queueDeactivatedHooks(instance: UnknownComponentInstance): void {
  if (instance.isUnmounted || !instance.isMounted || instance.deactivatedHooks.length === 0) {
    return
  }

  disposeSchedulerJob(instance.activatedHookJob)
  instance.activatedHookJob = undefined

  instance.deactivatedHookJob ??= (() => {
    const job: SchedulerJob = () => {
      instance.deactivatedHookJob = undefined
      invokeHooks(instance, instance.deactivatedHooks, 'deactivated')
    }

    job.id = instance.postOrderId

    return job
  })()

  queuePostFlushCb(instance.deactivatedHookJob)
}
