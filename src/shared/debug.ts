/**
 * 调试日志模块。
 *
 * 本模块提供具名调试记录器，支持：
 * - 在创建时判定是否启用日志，便于生产环境 tree-shake
 * - 为日志添加命名空间前缀，便于过滤与定位来源
 * - 支持可选的负载输出，格式化为 JSON
 */
import { __INTERNAL_DEV__, isDevDebugEnvironment } from './env.ts'

/**
 * 调试日志记录器签名，按方法名、描述与可选负载输出调试信息。
 */
export type DebugLogger = (method: string, message: string, payload?: unknown) => void

/**
 * 创建具名调试记录器，在创建时判定是否启用日志，便于生产环境 tree-shake。
 *
 * @param namespace - 日志命名空间前缀，便于过滤定位
 * @returns 依据环境决定是否实际输出的调试记录器
 */
export function createDebugLogger(namespace: string): DebugLogger {
  /* 内部调试可在构建期直接裁剪。 */
  if (!__INTERNAL_DEV__) {
    return () => {
      return undefined
    }
  }

  /* 创建阶段缓存调试开关，避免每次调用重复判断环境。 */
  const shouldLog = isDevDebugEnvironment()

  /* 未开启调试时直接返回空实现，保持调用端无条件可调用。 */
  if (!shouldLog) {
    return () => {
      return undefined
    }
  }

  /* 为日志添加命名空间前缀，便于过滤与定位来源。 */
  const prefix = `[${namespace}]`

  /* 运行态根据是否存在负载选择输出格式。 */
  return (method, message, payload) => {
    /* 无负载时仅输出基础信息，避免多余换行。 */
    if (payload === undefined) {
      console.debug(prefix, method, message)

      return
    }

    /* 带负载时先输出标题，再格式化输出内容并加空行分隔。 */
    console.debug(prefix, method, message)
    console.debug(JSON.stringify(payload, null, 2))
    console.debug('')
  }
}
