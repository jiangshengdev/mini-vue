import { ReactiveEffect } from '../effect.ts'
import { recordEffectScope, recordScopeCleanup } from '../effect-scope.ts'
import { effectStack } from '../internals/index.ts'
import type { Ref } from '../ref/types.ts'
import { createGetter, resolveDeepOption } from './utils.ts'
import type { PlainObject } from '@/shared/index.ts'
import { errorContexts, errorHandlerPhases, runWithErrorChannelSilent } from '@/shared/index.ts'

/**
 * `watch` 可接受的追踪源类型，覆盖 ref、getter 与普通对象。
 *
 * @public
 */
export type WatchSource<T> = Ref<T> | (() => T) | PlainObject

/**
 * 外部可调用的停止函数类型。
 *
 * @public
 */
export type WatchStopHandle = () => void

/** 供用户注册的清理回调类型。 */
export type WatchCleanup = () => void

/**
 * `watch` 回调签名，暴露新旧值和清理钩子。
 *
 * @public
 */
export type WatchCallback<T> = (
  newValue: T,
  oldValue: T | undefined,
  onCleanup: (cleanup: WatchCleanup) => void,
) => void

/**
 * 控制 `watch` 行为的可选项。
 *
 * @public
 */
export interface WatchOptions {
  /** `true` 时立即执行一次回调。 */
  immediate?: boolean
  /** `true` 时强制深度遍历追踪。 */
  deep?: boolean
}

/**
 * 建立响应式副作用并在数据变化时派发回调。
 * - 支持深度遍历与懒执行策略。
 * - 允许注册清理逻辑并与父 effect 生命周期同步。
 *
 * @public
 *
 * @remarks 回调内部抛出的异常不会向外冒泡，而是仅通过 setErrorHandler 汇报，确保同一触发链的其余副作用可继续执行。
 */
export function watch<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
  options: WatchOptions = {},
): WatchStopHandle {
  /* 预先解析执行策略，避免每次触发重复判断。 */
  const { immediate = false } = options
  const deep = resolveDeepOption(source, options.deep)
  const getter = createGetter(source, deep)
  let cleanup: WatchCleanup | undefined
  let oldValue: T | undefined
  let hasOldValue = false

  /**
   * 替换当前清理逻辑，下一次触发前确保调用旧清理函数。
   */
  const onCleanup = (fn: WatchCleanup): void => {
    cleanup = fn
  }

  /* 构建底层 effect，调度回调统一走 `runWatchJob` 以便复用逻辑。 */
  const runner = new ReactiveEffect(getter as () => T, () => {
    runWatchJob()
  })

  recordEffectScope(runner)

  /**
   * 在依赖变更时执行的调度任务，负责比较、清理与派发。
   */
  function runWatchJob(): void {
    /* `effect` 已失活时直接跳出，避免多余触发。 */
    if (!runner.active) {
      return
    }

    /* 通过 runner.run() 拿到最新值，确保依赖重新收集。 */
    const newValue = runner.run()

    /* 浅监听且值未变更时跳过回调，提高性能。 */
    if (!deep && hasOldValue && Object.is(newValue, oldValue)) {
      return
    }

    runRegisteredCleanup()

    const previousValue = hasOldValue ? oldValue : undefined

    /* 调用用户回调并提供本轮注册清理的机会，异常也要更新旧值。 */
    runWithErrorChannelSilent(
      () => {
        callback(newValue, previousValue, onCleanup)
      },
      {
        origin: errorContexts.watchCallback,
        handlerPhase: errorHandlerPhases.sync,
        afterRun() {
          oldValue = newValue
          hasOldValue = true
        },
      },
    )
  }

  /**
   * 暴露给外部的停止函数，终止 effect 并运行末次清理。
   */
  const stop: WatchStopHandle = () => {
    runner.stop()
    runRegisteredCleanup()
  }

  recordScopeCleanup(stop)

  /* 如存在父级 effect，则登记 stop 以便作用域销毁时统一清理。 */
  const parentEffect = effectStack.current

  if (parentEffect) {
    parentEffect.registerCleanup(stop)
  }

  function runRegisteredCleanup(): void {
    if (!cleanup) {
      return
    }

    const previousCleanup = cleanup

    cleanup = undefined

    runWithErrorChannelSilent(previousCleanup, {
      origin: errorContexts.watchCleanup,
      handlerPhase: errorHandlerPhases.sync,
    })
  }

  /* 根据 immediate 选择立即执行还是先懒获取一次旧值。 */
  if (immediate) {
    runWatchJob()
  } else {
    oldValue = runner.run()
    hasOldValue = true
  }

  return stop
}
