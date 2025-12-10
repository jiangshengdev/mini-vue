import type { ErrorContext, ErrorMeta, ErrorPhase, ErrorToken } from './error-channel.ts'

/**
 * 标准化的错误处理函数签名，统一传入原始异常与上下文标签。
 *
 * @beta
 */
export interface ErrorPayload {
  /** 标记触发错误的运行上下文，方便分类处理。 */
  readonly origin: ErrorContext
  /** 指示本次调度发生在同步还是异步阶段。 */
  readonly handlerPhase: ErrorPhase
  /** 透传的可选元数据，用于补充定位信息。 */
  readonly meta?: ErrorMeta
  /** 调度过程中生成的 token，便于外部追踪状态。 */
  readonly token?: ErrorToken
}

/**
 * 自定义的错误处理器签名，统一接收原始异常、上下文标签与调度 payload。
 *
 * @beta
 */
export type ErrorHandler = (error: unknown, context: ErrorContext, payload?: ErrorPayload) => void

/**
 * 缓存当前生效的错误处理器，未设置时保持 undefined 以便回退默认行为。
 */
let currentErrorHandler: ErrorHandler | undefined

/**
 * 允许外部重写默认的错误处理逻辑，便于在响应式、调度器与组件清理阶段统一兜底。
 *
 * @remarks 注册后的处理器会在 effect、effectScope.run、watch 回调、scheduler 以及组件 cleanup 等入口发生异常时被调用；个别入口（如 effect）会在回调完成后继续抛出原始错误。
 *
 * @beta
 */
export function setErrorHandler(handler?: ErrorHandler): void {
  currentErrorHandler = handler
}

/**
 * 在内部捕获异常时调用，统一调度至用户提供的处理器或兜底方案。
 */
export function handleError(
  error: unknown,
  payload: ErrorPayload,
  shouldRethrowAsync = true,
): void {
  const { origin } = payload

  /* 优先通过用户注册的处理器上报，以便框架层做统一告警。 */
  if (currentErrorHandler) {
    try {
      currentErrorHandler(error, origin, payload)
    } catch (handlerError) {
      /* 处理器自身抛错时仍需异步抛出，但不能阻断当前触发链。 */
      rethrowAsync(handlerError)
    }

    return
  }

  /* 未自定义处理器时，根据配置选择是否异步抛出原始异常。 */
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
