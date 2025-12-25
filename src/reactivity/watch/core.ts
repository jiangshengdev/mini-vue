import { recordEffectScope, recordScopeCleanup } from '../effect-scope.ts'
import { effectStack, ReactiveEffect } from '../effect.ts'
import type { Ref } from '../ref/types.ts'
import { createGetter, resolveDeepOption } from './utils.ts'
import type { PlainObject } from '@/shared/index.ts'
import { errorContexts, errorPhases, runSilent } from '@/shared/index.ts'

/**
 * `watch` 可接受的追踪源类型，覆盖 ref、getter 与普通对象。
 *
 * @remarks
 * - Ref：追踪 `value` 属性的变化。
 * - getter 函数：追踪函数执行期间读取的响应式属性。
 * - 普通对象：若为 reactive 代理，默认深度追踪所有嵌套字段。
 *
 * @public
 */
export type WatchSource<T> = Ref<T> | (() => T) | PlainObject

/**
 * 外部可调用的停止函数类型。
 *
 * @remarks
 * - 调用后会停止 watch 的响应式追踪，并执行最后一次清理回调。
 *
 * @public
 */
export type WatchStopHandle = () => void

/**
 * 供用户注册的清理回调类型。
 *
 * @remarks
 * - 清理回调会在下一次回调执行前或 watch 停止时被调用。
 */
export type WatchCleanup = () => void

/**
 * `watch` 回调签名，暴露新旧值和清理钩子。
 *
 * @param newValue - 最新的值
 * @param oldValue - 上一次的值，首次执行时为 `undefined`
 * @param onCleanup - 注册清理回调的函数
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
  /**
   * `true` 时立即执行一次回调，而非等待首次变更。
   */
  immediate?: boolean

  /**
   * `true` 时强制深度遍历追踪，即使源是 getter 或 ref。
   *
   * @remarks
   * - 对于 reactive 对象，默认就是深度追踪。
   * - 对于 getter 或 ref，默认只追踪返回值本身。
   */
  deep?: boolean
}

/**
 * 建立响应式副作用并在数据变化时派发回调。
 *
 * @param source - 追踪源，可以是 ref、getter 函数或 reactive 对象
 * @param callback - 数据变化时执行的回调函数
 * @param options - 可选配置，支持 immediate 和 deep
 * @returns 停止函数，调用后会停止追踪并执行最后一次清理
 *
 * @remarks
 * - 支持深度遍历与懒执行策略。
 * - 允许注册清理逻辑并与父 effect 生命周期同步。
 * - 回调内部抛出的异常不会向外冒泡，而是仅通过 `setErrorHandler` 汇报，确保同一触发链的其余副作用可继续执行。
 * - watch 会被自动登记到当前活跃的 `effectScope`，便于统一管理生命周期。
 *
 * @public
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

  /* 构建底层 `effect`，调度回调统一走 `runWatchJob` 以便复用逻辑。 */
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

    /* 通过 `runner.run()` 拿到最新值，确保依赖重新收集。 */
    const newValue = runner.run()

    /* 浅监听且值未变更时跳过回调，提高性能。 */
    if (!deep && hasOldValue && Object.is(newValue, oldValue)) {
      return
    }

    runRegisteredCleanup()

    const previousValue = hasOldValue ? oldValue : undefined

    /* 调用用户回调并提供本轮注册清理的机会，异常也要更新旧值。 */
    runSilent(
      () => {
        callback(newValue, previousValue, onCleanup)
      },
      {
        origin: errorContexts.watchCallback,
        handlerPhase: errorPhases.sync,
        afterRun() {
          oldValue = newValue
          hasOldValue = true
        },
      },
    )
  }

  /**
   * 暴露给外部的停止函数，终止 `effect` 并运行末次清理。
   */
  const stop: WatchStopHandle = () => {
    runner.stop()
    runRegisteredCleanup()
  }

  recordScopeCleanup(stop)

  /* 如存在父级 `effect`，则登记 `stop` 以便作用域销毁时统一清理。 */
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

    runSilent(previousCleanup, {
      origin: errorContexts.watchCleanup,
      handlerPhase: errorPhases.sync,
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
