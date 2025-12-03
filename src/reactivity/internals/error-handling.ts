/**
 * 管理响应式系统的统一错误处理流程，并描述错误上报时的上下文来源。
 */
export type ReactivityErrorContext =
  | 'scheduler'
  | 'effect-runner'
  | 'effect-scope-run'
  | 'effect-scope-cleanup'
  | 'watch-callback'
  | 'component-cleanup'

/**
 * 标准化的错误处理函数签名，统一传入原始异常与上下文标签。
 */
export type ReactivityErrorHandler = (error: unknown, context: ReactivityErrorContext) => void

/**
 * 缓存当前生效的错误处理器，未设置时保持 undefined 以便回退默认行为。
 */
let currentReactivityErrorHandler: ReactivityErrorHandler | undefined

/**
 * 允许外部重写默认的错误处理逻辑，便于集成框架级兜底。
 *
 * @remarks 注册后的处理器会在 effect、effectScope.run、watch 回调以及调度器等入口发生异常时被调用；个别入口（如 effect）会在回调完成后继续抛出原始错误。
 */
export function setReactivityErrorHandler(handler?: ReactivityErrorHandler): void {
  currentReactivityErrorHandler = handler
}

/**
 * 在内部捕获异常时调用，统一调度至用户提供的处理器或兜底方案。
 */
export function handleReactivityError(error: unknown, context: ReactivityErrorContext): void {
  /* 优先通过用户注册的处理器上报，以便框架层做统一告警。 */
  if (currentReactivityErrorHandler) {
    try {
      currentReactivityErrorHandler(error, context)
    } catch (handlerError) {
      /* 处理器自身抛错时仍需异步抛出，但不能阻断当前触发链。 */
      rethrowAsync(handlerError)
    }

    return
  }

  rethrowAsync(error)
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
    throw new Error(String(error))
  })
}
