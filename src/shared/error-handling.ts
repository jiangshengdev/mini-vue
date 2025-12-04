import type {
  RuntimeErrorContext,
  RuntimeErrorHandlerPhase,
  RuntimeErrorMeta,
  RuntimeErrorToken,
} from './runtime-error-channel.ts'

export type { RuntimeErrorContext } from './runtime-error-channel.ts'

/**
 * 标准化的错误处理函数签名，统一传入原始异常与上下文标签。
 */
export interface RuntimeErrorDispatchPayload {
  readonly origin: RuntimeErrorContext
  readonly handlerPhase: RuntimeErrorHandlerPhase
  readonly meta?: RuntimeErrorMeta
  readonly token?: RuntimeErrorToken
}

export type RuntimeErrorHandler = (
  error: unknown,
  context: RuntimeErrorContext,
  dispatchPayload?: RuntimeErrorDispatchPayload,
) => void

/**
 * 缓存当前生效的错误处理器，未设置时保持 undefined 以便回退默认行为。
 */
let currentRuntimeErrorHandler: RuntimeErrorHandler | undefined

/**
 * 允许外部重写默认的错误处理逻辑，便于在响应式、调度器与组件清理阶段统一兜底。
 *
 * @remarks 注册后的处理器会在 effect、effectScope.run、watch 回调、scheduler 以及组件 cleanup 等入口发生异常时被调用；个别入口（如 effect）会在回调完成后继续抛出原始错误。
 */
export function setRuntimeErrorHandler(handler?: RuntimeErrorHandler): void {
  currentRuntimeErrorHandler = handler
}

/**
 * 在内部捕获异常时调用，统一调度至用户提供的处理器或兜底方案。
 */
export function handleRuntimeError(
  error: unknown,
  dispatchPayload: RuntimeErrorDispatchPayload,
  shouldRethrowAsync = true,
): void {
  const { origin } = dispatchPayload

  /* 优先通过用户注册的处理器上报，以便框架层做统一告警。 */
  if (currentRuntimeErrorHandler) {
    try {
      currentRuntimeErrorHandler(error, origin, dispatchPayload)
    } catch (handlerError) {
      /* 处理器自身抛错时仍需异步抛出，但不能阻断当前触发链。 */
      rethrowAsync(handlerError)
    }

    return
  }

  if (shouldRethrowAsync) {
    rethrowAsync(error)
  }
}

/**
 * 将异常排入微任务队列中异步抛出，避免阻断当前同步流程。
 */
function rethrowAsync(error: unknown): void {
  /* 使用 queueMicrotask 确保错误在下一个事件循环阶段被宿主捕获。 */
  queueMicrotask(() => {
    if (error instanceof Error) {
      throw error
    }

    /* 对非 Error 类型做兜底转换，保证输出信息可读。 */
    throw new Error(String(error), { cause: error })
  })
}
