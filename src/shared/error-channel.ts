import { handleError } from './error-handling.ts'
import type { PlainObject } from './types.ts'
import { isThenable } from './utils.ts'
import { runtimeCoreAsyncSetupNotSupported, sharedRunnerNoPromise } from '@/messages/index.ts'

/**
 * 框架内预设的错误上下文标签，标记异常来源位置。
 */
export const errorContexts = {
  /** 调度队列或 scheduler 内部抛错。 */
  scheduler: 'scheduler',
  /** 副作用 runner 执行阶段的异常。 */
  effectRunner: 'effectRunner',
  /** 副作用 cleanup 函数抛出的异常。 */
  effectCleanup: 'effectCleanup',
  /** `effect` scope run 阶段的错误。 */
  effectScopeRun: 'effectScopeRun',
  /** `effect` scope cleanup 中的错误。 */
  effectScopeCleanup: 'effectScopeCleanup',
  /** `watch` 回调体抛出的异常。 */
  watchCallback: 'watchCallback',
  /** `watch` 清理函数抛出的异常。 */
  watchCleanup: 'watchCleanup',
  /** 组件 setup 阶段出错。 */
  componentSetup: 'componentSetup',
  /** 组件卸载或 cleanup 阶段出错。 */
  componentCleanup: 'componentCleanup',
  /** 应用层插件安装（app.use/app.provide 等）阶段出错。 */
  appPluginUse: 'appPluginUse',
  /** `computed` setter 抛出的异常。 */
  computedSetter: 'computedSetter',
  /** DOM 宿主解析容器选择器时抛出的异常。 */
  domContainerResolve: 'domContainerResolve',
} as const
/**
 * 错误来源上下文的联合类型，用于约束上报入口的来源标签。
 *
 * @beta
 */
export type ErrorContext = (typeof errorContexts)[keyof typeof errorContexts]

/**
 * 控制异常是否向上传播，`silent` 模式吞掉同步异常。
 */
export const errorMode = {
  /** 捕获后同步抛出，交由调用者处理。 */
  throw: 'throw',
  /** 在同步阶段吞掉异常，避免污染主流程。 */
  silent: 'silent',
} as const
/**
 * 错误传播模式的联合类型，控制同步阶段是否把异常继续抛给调用方。
 */
export type ErrorMode = (typeof errorMode)[keyof typeof errorMode]
/**
 * 区分当前错误是在同步还是异步阶段被捕获。
 */
export const errorPhases = {
  /** 代表当前异常在同步栈内被捕获。 */
  sync: 'sync',
  /** 表示由异步兜底（如 microtask）捕获。 */
  async: 'async',
} as const
/**
 * 错误捕获阶段的联合类型，用于标记错误是在同步栈内捕获还是由异步兜底捕获。
 */
export type ErrorPhase = (typeof errorPhases)[keyof typeof errorPhases]

/**
 * 允许透传只读的附加上下文信息，便于错误处理器记录。
 *
 * @beta
 */
export type ErrorMeta = Readonly<PlainObject>

/**
 * 触发错误上报时的配置项，控制来源标签与处理策略。
 */
interface ErrorDispatchOptions<P extends ErrorPhase = ErrorPhase> {
  /** 标记异常发生的运行时上下文，用于日志聚合。 */
  readonly origin: ErrorContext
  /** 指示当前捕获处于同步还是异步阶段。 */
  readonly handlerPhase: P
  /** 透传额外的业务数据，辅助错误定位。 */
  readonly meta?: ErrorMeta
  /** 允许在异步阶段关闭兜底重抛，避免重复噪声。 */
  readonly shouldRethrowAsync?: boolean
}

/**
 * 每次错误调度返回的 token，用于描述真实触发情况。
 *
 * @beta
 */
export interface ErrorToken {
  /** 捕获到的异常对象（框架侧保证为 Error）。 */
  readonly error: Error
  /** 异常来源标签，便于上层辨别来源。 */
  readonly origin: ErrorContext
  /** 调度所处阶段，帮助区分 sync/async 管线。 */
  readonly handlerPhase: ErrorPhase
  /** 伴随异常一起上报的元数据。 */
  readonly meta?: ErrorMeta
  /** 当前 dispatch 是否实际触发错误处理器，便于上层判断是否需要额外补偿。 */
  readonly notified: boolean
}

/**
 * 调度前执行的钩子，可用于埋点或切换追踪上下文。
 */
export type ErrorBeforeHook = () => void
/**
 * 调度结束后的钩子，接收最终 token 以便记录结果。
 */
export type ErrorAfterHook = (token?: ErrorToken) => void

/**
 * 运行带错误通道的回调时附带的配置项。
 */
export interface ErrorRunOptions<P extends ErrorPhase = ErrorPhase>
  extends ErrorDispatchOptions<P> {
  /** 调度前执行的 Hook，通常用于准备工作。 */
  readonly beforeRun?: ErrorBeforeHook
  /** 调度结束后的 Hook，可感知 token 结果。 */
  readonly afterRun?: ErrorAfterHook
}

/**
 * `runThrowing` 专用的配置项，强制要求同步阶段调度以避免双重抛错。
 */
export type ThrowingErrorRunOptions = ErrorRunOptions<typeof errorPhases.sync>

/**
 * 记录已通知的错误对象，避免在同一对象上重复上报。
 */
let tickNotifiedErrors = new WeakSet<Error>()

/**
 * 标记是否已安排过“本 tick 去重表重置”的 microtask，避免重复注册。
 */
let isDedupeResetScheduled = false

/**
 * 在当前事件循环 tick 结束时重置去重表。
 *
 * @remarks
 * - 设计目标是“同一 tick 内同一 Error 对象只上报一次”，避免重复噪声。
 * - 采用 microtask 让重置尽可能靠近本轮同步逻辑尾部，同时不会阻塞当前调用栈。
 */
function scheduleDedupeRegistryReset(): void {
  if (isDedupeResetScheduled) {
    return
  }

  isDedupeResetScheduled = true

  queueMicrotask(() => {
    tickNotifiedErrors = new WeakSet<Error>()
    isDedupeResetScheduled = false
  })
}

/**
 * 将任意捕获值规范化为 Error 实例，保证错误通道对外的形态一致。
 *
 * @remarks
 * - 非 Error 值会被包装为 Error，并通过 cause 保留原始信息。
 */
function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  return new Error(String(error), { cause: error })
}

/**
 * 将捕获到的异常交由错误处理器统一上报，并返回调度 token。
 */
export function dispatchError(error: Error, dispatchOptions: ErrorDispatchOptions): ErrorToken {
  const alreadyNotified = tickNotifiedErrors.has(error)
  const shouldNotify = !alreadyNotified

  /* 构造 token 以记录本次调度的真实触发信息，供钩子与上层使用。 */
  const token: ErrorToken = {
    error,
    origin: dispatchOptions.origin,
    handlerPhase: dispatchOptions.handlerPhase,
    meta: dispatchOptions.meta,
    notified: shouldNotify,
  }

  /* 如果之前已经上报过该错误，则直接返回 token 告知调用者。 */
  if (!shouldNotify) {
    return token
  }

  /* 记录已上报的对象，并在当前 tick 结束后重置去重表。 */
  tickNotifiedErrors.add(error)
  scheduleDedupeRegistryReset()

  /* 判断当前 dispatch 是否处于异步阶段。 */
  const isAsyncPhase = dispatchOptions.handlerPhase === errorPhases.async
  /* 允许调用方显式关闭异步重抛。 */
  const shouldRethrowAsync = isAsyncPhase && dispatchOptions.shouldRethrowAsync !== false

  /* 委托给框架级错误处理函数，并按需开启异步重抛。 */
  handleError(
    error,
    {
      origin: dispatchOptions.origin,
      handlerPhase: dispatchOptions.handlerPhase,
      meta: dispatchOptions.meta,
      token,
    },
    shouldRethrowAsync,
  )

  return token
}

/**
 * 统一封装“执行 runner + 捕获并上报异常”的同步入口。
 *
 * @remarks
 * - 负责串联 before/after hook，保证无论成功与否都能观察到 token。
 * - 根据传播模式决定是否把规范化后的异常继续同步抛出。
 */
function runWithChannel<T, P extends ErrorPhase>(
  runner: () => T,
  propagate: ErrorMode,
  options: ErrorRunOptions<P>,
): T | undefined {
  /* 保存 dispatch token 以便 finally 阶段透出调度结果。 */
  let token: ErrorToken | undefined

  try {
    /* 在主逻辑前执行 before hook，便于构建错误上下文。 */
    options.beforeRun?.()
    /* 尝试执行用户逻辑，一旦抛错交由 catch 统一处理。 */
    const result = runner()

    /* 明确拒绝 Promise/thenable runner，避免异步阶段漏报与提前清理。 */
    if (isThenable(result)) {
      const message =
        options.origin === errorContexts.componentSetup
          ? runtimeCoreAsyncSetupNotSupported
          : sharedRunnerNoPromise

      throw new TypeError(message, { cause: result })
    }

    return result
  } catch (error) {
    const normalizedError = ensureError(error)

    /* 将异常交给错误通道统一调度，并获得可观测 token。 */
    token = dispatchError(normalizedError, options)

    /* 同步传播策略需要立即抛出规范化后的异常。 */
    if (propagate === errorMode.throw) {
      throw normalizedError
    }

    /* 静默模式下返回 undefined，让调用方自行判断。 */
    return undefined
  } finally {
    /* 无论成功或失败都执行 after hook，并透出 token。 */
    options.afterRun?.(token)
  }
}

/**
 * 同步传播异常，调用方接收原始抛错。
 */
export function runThrowing<T>(runner: () => T, options: ThrowingErrorRunOptions): T {
  return runWithChannel(runner, errorMode.throw, options) as T
}

/**
 * 静默处理异常，调用方接收 undefined 以继续流程。
 */
export function runSilent<T>(runner: () => T, options: ErrorRunOptions): T | undefined {
  return runWithChannel(runner, errorMode.silent, options)
}
