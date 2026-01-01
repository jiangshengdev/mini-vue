/**
 * runtime-core 组件生命周期钩子：
 * - 在 `setup()` 中注册钩子；
 * - 在挂载/更新/卸载时由渲染流程触发；
 * - 依赖 scheduler 的 post 队列保证父子顺序与去重。
 */
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

type LifecycleHookType =
  | 'mounted'
  | 'unmounted'
  | 'beforeUpdate'
  | 'updated'
  | 'activated'
  | 'deactivated'

type HookStorageKey =
  | 'mountedHooks'
  | 'unmountedHooks'
  | 'beforeUpdateHooks'
  | 'updatedHooks'
  | 'activatedHooks'
  | 'deactivatedHooks'

let componentPostOrderId = 0

/**
 * 根据当前是否处于 scheduler flush 阶段选择错误标记阶段。
 *
 * @remarks
 * - 生命周期 hook 可能在同步 patch 中直接触发，也可能在 post 队列异步触发。
 */
function resolveHookPhase() {
  return isSchedulerFlushing() ? errorPhases.async : errorPhases.sync
}

/**
 * 仅开发态：为错误通道提供 hook 上下文信息，便于定位出错组件与钩子类型。
 */
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

/**
 * 安全调用单个生命周期 hook。
 *
 * @remarks
 * - hook 执行期间需要暴露 currentInstance（对齐 Vue3），便于高级用法读取实例上下文。
 * - 使用 `withoutTracking` 避免 hook 内部读取响应式状态意外被当前渲染 effect 收集。
 */
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

/**
 * 按注册顺序依次执行同类 hook。
 */
function invokeHooks(
  instance: UnknownComponentInstance,
  hooks: LifecycleHook[],
  type: LifecycleHookType,
): void {
  for (const hook of hooks) {
    invokeHook(instance, hook, type)
  }
}

/**
 * 向当前组件实例注入生命周期 hook（setup-only）。
 *
 * @remarks
 * - 生命周期注册严格限定在 `setup()` 执行窗口期，避免组件外注册带来的隐式全局状态。
 * - 抛错时附带 `currentInstance` 作为 cause，便于调试定位调用来源。
 */
function injectLifecycleHook(key: HookStorageKey, hook: LifecycleHook, message: string): void {
  const instance = getCurrentSetupInstance()

  if (!instance) {
    throw new Error(message, { cause: { currentInstance: getCurrentInstance() } })
  }

  instance[key].push(hook)
}

/**
 * 注册 `onMounted` 钩子：组件完成首次挂载后在 post 队列触发。
 */
export function onMounted(hook: LifecycleHook): void {
  injectLifecycleHook('mountedHooks', hook, runtimeCoreOnMountedOutsideSetup)
}

/**
 * 注册 `onUnmounted` 钩子：组件卸载完成后在 post 队列触发。
 */
export function onUnmounted(hook: LifecycleHook): void {
  injectLifecycleHook('unmountedHooks', hook, runtimeCoreOnUnmountedOutsideSetup)
}

/**
 * 注册 `onActivated` 钩子：KeepAlive 组件被激活后在 post 队列触发。
 */
export function onActivated(hook: LifecycleHook): void {
  injectLifecycleHook('activatedHooks', hook, runtimeCoreOnActivatedOutsideSetup)
}

/**
 * 注册 `onDeactivated` 钩子：KeepAlive 组件被失活后在 post 队列触发。
 */
export function onDeactivated(hook: LifecycleHook): void {
  injectLifecycleHook('deactivatedHooks', hook, runtimeCoreOnDeactivatedOutsideSetup)
}

/**
 * 注册 `onBeforeUpdate` 钩子：组件更新 patch 之前同步触发。
 */
export function onBeforeUpdate(hook: LifecycleHook): void {
  injectLifecycleHook('beforeUpdateHooks', hook, runtimeCoreOnBeforeUpdateOutsideSetup)
}

/**
 * 注册 `onUpdated` 钩子：组件更新完成后在 post 队列触发。
 */
export function onUpdated(hook: LifecycleHook): void {
  injectLifecycleHook('updatedHooks', hook, runtimeCoreOnUpdatedOutsideSetup)
}

/**
 * 将已入队的生命周期 post jobs 标记为过期，避免卸载后仍执行旧回调。
 */
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

/**
 * 为组件分配稳定的 post-order id，保证 post 队列生命周期的父子顺序。
 *
 * @remarks
 * - 在组件“首次挂载完成”时调用，序号单调递增。
 * - post 队列 job 使用该 id 排序，从而保证子组件先于父组件执行。
 */
export function markComponentMounted(instance: UnknownComponentInstance): void {
  if (instance.postOrderId !== 0) {
    return
  }

  componentPostOrderId += 1
  instance.postOrderId = componentPostOrderId
}

/**
 * 将 `mountedHooks` 合并为一个 post job 入队，并以 postOrderId 排序。
 */
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

/**
 * 将 `activatedHooks` 合并为一个 post job 入队，并保证与 `deactivated` 互斥。
 */
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

/**
 * 在组件更新 patch 之前同步执行 `beforeUpdateHooks`。
 */
export function invokeBeforeUpdateHooks(instance: UnknownComponentInstance): void {
  if (instance.isUnmounted || instance.beforeUpdateHooks.length === 0) {
    return
  }

  invokeHooks(instance, instance.beforeUpdateHooks, 'beforeUpdate')
}

/**
 * 将 `updatedHooks` 合并为一个 post job 入队，确保同一轮更新只触发一次。
 */
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

/**
 * 将 `unmountedHooks` 合并为一个 post job 入队。
 */
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

/**
 * 将 `deactivatedHooks` 合并为一个 post job 入队，并保证与 `activated` 互斥。
 */
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
