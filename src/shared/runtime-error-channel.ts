import { handleRuntimeError } from './error-handling.ts'
import type { PlainObject } from '@/shared/types.ts'

/**
 * 框架内预设的错误上下文标签，标记异常来源位置。
 */
export const runtimeErrorContexts = {
  /** 调度队列或 scheduler 内部抛错。 */
  scheduler: 'scheduler',
  /** 副作用 runner 执行阶段的异常。 */
  effectRunner: 'effect-runner',
  /** 副作用 cleanup 函数抛出的异常。 */
  effectCleanup: 'effect-cleanup',
  /** effect scope run 阶段的错误。 */
  effectScopeRun: 'effect-scope-run',
  /** effect scope cleanup 中的错误。 */
  effectScopeCleanup: 'effect-scope-cleanup',
  /** watch 回调体抛出的异常。 */
  watchCallback: 'watch-callback',
  /** watch 清理函数抛出的异常。 */
  watchCleanup: 'watch-cleanup',
  /** 组件 setup 阶段出错。 */
  componentSetup: 'component-setup',
  /** 组件卸载或 cleanup 阶段出错。 */
  componentCleanup: 'component-cleanup',
  /** computed setter 抛出的异常。 */
  computedSetter: 'computed-setter',
} as const
export type RuntimeErrorContext = (typeof runtimeErrorContexts)[keyof typeof runtimeErrorContexts]

/**
 * 控制异常是否向上传播，`silent` 模式吞掉同步异常。
 */
export const runtimeErrorPropagationStrategies = {
  /** 捕获后同步抛出，交由调用者处理。 */
  sync: 'sync',
  /** 在同步阶段吞掉异常，避免污染主流程。 */
  silent: 'silent',
} as const
export type RuntimeErrorPropagationStrategy =
  (typeof runtimeErrorPropagationStrategies)[keyof typeof runtimeErrorPropagationStrategies]
/**
 * 区分当前错误是在同步还是异步阶段被捕获。
 */
export const runtimeErrorHandlerPhases = {
  /** 代表当前异常在同步栈内被捕获。 */
  sync: 'sync',
  /** 表示由异步兜底（如 microtask）捕获。 */
  async: 'async',
} as const
export type RuntimeErrorHandlerPhase =
  (typeof runtimeErrorHandlerPhases)[keyof typeof runtimeErrorHandlerPhases]

/**
 * 允许透传只读的附加上下文信息，便于错误处理器记录。
 */
export type RuntimeErrorMeta = Readonly<PlainObject>

/**
 * 触发错误上报时的配置项，控制来源标签与处理策略。
 */
interface RuntimeErrorDispatchOptions {
  /** 标记异常发生的运行时上下文，用于日志聚合。 */
  readonly origin: RuntimeErrorContext
  /** 指示当前捕获处于同步还是异步阶段。 */
  readonly handlerPhase: RuntimeErrorHandlerPhase
  /** 透传额外的业务数据，辅助错误定位。 */
  readonly meta?: RuntimeErrorMeta
  /** 允许在异步阶段关闭兜底重抛，避免重复噪声。 */
  readonly shouldRethrowAsync?: boolean
}

/**
 * 每次错误调度返回的 token，用于描述真实触发情况。
 */
export interface RuntimeErrorToken {
  /** 捕获到的原始异常对象。 */
  readonly error: unknown
  /** 异常来源标签，便于上层辨别来源。 */
  readonly origin: RuntimeErrorContext
  /** 调度所处阶段，帮助区分 sync/async 管线。 */
  readonly handlerPhase: RuntimeErrorHandlerPhase
  /** 伴随异常一起上报的元数据。 */
  readonly meta?: RuntimeErrorMeta
  /** 当前 dispatch 是否实际触发错误处理器，便于上层判断是否需要额外补偿。 */
  readonly notified: boolean
}

/**
 * 调度前执行的钩子，可用于埋点或切换追踪上下文。
 */
export type ErrorChannelBeforeHook = () => void
/**
 * 调度结束后的钩子，接收最终 token 以便记录结果。
 */
export type ErrorChannelAfterHook = (token?: RuntimeErrorToken) => void

/**
 * 运行带错误通道的回调时附带的配置项。
 */
export interface RunWithErrorChannelOptions extends RuntimeErrorDispatchOptions {
  /** 指定捕获后是同步抛出还是静默吞掉异常。 */
  readonly propagate: RuntimeErrorPropagationStrategy
  /** 调度前执行的 Hook，通常用于准备工作。 */
  readonly beforeRun?: ErrorChannelBeforeHook
  /** 调度结束后的 Hook，可感知 token 结果。 */
  readonly afterRun?: ErrorChannelAfterHook
}

/**
 * 记录已通知的错误对象，避免在同一对象上重复上报。
 */
const notifiedErrorRegistry = new WeakSet<PlainObject>()

/**
 * 将捕获到的异常交由错误处理器统一上报，并返回调度 token。
 */
export function dispatchRuntimeError(
  error: unknown,
  dispatchOptions: RuntimeErrorDispatchOptions,
): RuntimeErrorToken {
  /* 仅对对象类型做去重记录，原始类型直接透传。 */
  const shouldTrack = typeof error === 'object' && error !== null
  const alreadyNotified = shouldTrack && notifiedErrorRegistry.has(error as PlainObject)
  const shouldNotify = !alreadyNotified

  /* 构造 token 以记录本次调度的真实触发信息，供钩子与上层使用。 */
  const token: RuntimeErrorToken = {
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

  /* 记录已上报的对象，防止递归触发导致重复告警。 */
  if (shouldTrack) {
    notifiedErrorRegistry.add(error as PlainObject)
  }

  /* 委托给框架级错误处理函数，并按需开启异步重抛。 */
  handleRuntimeError(
    error,
    {
      origin: dispatchOptions.origin,
      handlerPhase: dispatchOptions.handlerPhase,
      meta: dispatchOptions.meta,
      token,
    },
    dispatchOptions.handlerPhase === runtimeErrorHandlerPhases.async &&
      dispatchOptions.shouldRethrowAsync !== false,
  )

  return token
}

/**
 * 使用统一的错误通道执行回调，按配置决定是否同步抛出。
 */
export function runWithErrorChannel<T>(
  runner: () => T,
  options: RunWithErrorChannelOptions & {
    propagate: (typeof runtimeErrorPropagationStrategies)['sync']
  },
): T
export function runWithErrorChannel<T>(
  runner: () => T,
  options: RunWithErrorChannelOptions & {
    propagate: (typeof runtimeErrorPropagationStrategies)['silent']
  },
): T | undefined

export function runWithErrorChannel<T>(
  runner: () => T,
  options: RunWithErrorChannelOptions,
): T | undefined {
  /* 在主逻辑前执行 before hook，便于构建错误上下文。 */
  options.beforeRun?.()

  /* 保存 dispatch token 以便 finally 阶段透出调度结果。 */
  let token: RuntimeErrorToken | undefined

  try {
    /* 尝试执行用户逻辑，一旦抛错交由 catch 统一处理。 */
    return runner()
  } catch (error) {
    /* 将异常交给错误通道统一调度，并获得可观测 token。 */
    token = dispatchRuntimeError(error, options)

    /* 同步传播策略需要立即抛出原始异常。 */
    if (options.propagate === runtimeErrorPropagationStrategies.sync) {
      throw error
    }

    /* 静默模式下返回 undefined，让调用方自行判断。 */
    return undefined
  } finally {
    /* 无论成功或失败都执行 after hook，并透出 token。 */
    options.afterRun?.(token)
  }
}
