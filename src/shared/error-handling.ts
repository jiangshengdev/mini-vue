/**
 * 管理 mini-vue 在响应式与运行时阶段的统一错误处理流程，并描述错误上报的上下文来源。
 */
export type MiniErrorContext =
  | 'scheduler'
  | 'effect-runner'
  | 'effect-scope-run'
  | 'effect-scope-cleanup'
  | 'watch-callback'
  | 'watch-cleanup'
  | 'component-cleanup'
  | 'computed-setter'

/**
 * 标准化的错误处理函数签名，统一传入原始异常与上下文标签。
 */
export interface MiniErrorOptions {
  /** 当未注册处理器时是否回退到异步抛错，默认为 true。 */
  readonly rethrowAsyncFallback?: boolean
}

export type MiniErrorHandler = (error: unknown, context: MiniErrorContext) => void

/**
 * 缓存当前生效的错误处理器，未设置时保持 undefined 以便回退默认行为。
 */
let currentMiniErrorHandler: MiniErrorHandler | undefined

/**
 * 允许外部重写默认的错误处理逻辑，便于在响应式、调度器与组件清理阶段统一兜底。
 *
 * @remarks 注册后的处理器会在 effect、effectScope.run、watch 回调、scheduler 以及组件 cleanup 等入口发生异常时被调用；个别入口（如 effect）会在回调完成后继续抛出原始错误。
 */
export function setMiniErrorHandler(handler?: MiniErrorHandler): void {
  currentMiniErrorHandler = handler
}

/**
 * 在内部捕获异常时调用，统一调度至用户提供的处理器或兜底方案。
 */
export function handleMiniError(
  error: unknown,
  context: MiniErrorContext,
  options: MiniErrorOptions = {},
): void {
  const { rethrowAsyncFallback = true } = options

  /* 优先通过用户注册的处理器上报，以便框架层做统一告警。 */
  if (currentMiniErrorHandler) {
    try {
      currentMiniErrorHandler(error, context)
    } catch (handlerError) {
      /* 处理器自身抛错时仍需异步抛出，但不能阻断当前触发链。 */
      rethrowAsync(handlerError)
    }

    return
  }

  if (rethrowAsyncFallback) {
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
