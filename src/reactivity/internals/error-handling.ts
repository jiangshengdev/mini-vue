/**
 * 管理响应式系统的统一错误处理流程，便于在不同入口复用。
 */
export type ReactivityErrorContext =
  | 'scheduler'
  | 'effect-runner'
  | 'effect-scope-run'
  | 'watch-callback'

export type ReactivityErrorHandler = (error: unknown, context: ReactivityErrorContext) => void

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
  if (currentReactivityErrorHandler) {
    try {
      currentReactivityErrorHandler(error, context)
    } catch (handlerError) {
      rethrowAsync(handlerError)
    }

    return
  }

  rethrowAsync(error)
}

function rethrowAsync(error: unknown): void {
  queueMicrotask(() => {
    if (error instanceof Error) {
      throw error
    }

    throw new Error(String(error))
  })
}
