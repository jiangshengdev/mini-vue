/**
 * 环境检测模块。
 *
 * 本模块提供开发/生产环境检测能力，包括：
 * - `__DEV__`：Vite 注入的开发模式标识，便于编译期摇树
 * - `__INTERNAL_DEV__`：内部专用的开发期开关，用于剔除内部调试代码
 * - `isDevDebugEnvironment`：检测是否启用了调试能力（inspect/IDE 连接器等）
 */

/**
 * 直接使用 Vite 注入的 DEV 常量，便于编译期摇树。
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const __DEV__ = import.meta.env.DEV

/**
 * 内部专用的开发期开关：仅 Vitest 浏览器 runner 注入字符串 'true'。
 * 构建时通过 define 将其置为 undefined，以便剔除内部调试代码。
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const __INTERNAL_DEV__ = import.meta.env.INTERNAL_DEV === 'true'

/**
 * 检测 Vitest 浏览器运行器是否开启 inspect-brk 调试。
 *
 * @returns 若浏览器 runner 开启 inspect 调试则为 true
 */
function isVitestBrowserInspectActive(): boolean {
  /* Vitest 浏览器 runner 在全局挂载 __vitest_browser_runner__，其中包含调试配置。 */
  const browserRunner = (
    globalThis as {
      __vitest_browser_runner__?: {
        config?: { inspectBrk?: boolean }
      }
    }
  ).__vitest_browser_runner__

  /* Vitest 浏览器模式下 __vitest_browser__ 为 boolean，调试信息挂在 runner.config。 */
  return Boolean(browserRunner?.config?.inspectBrk)
}

/**
 * 解析当前上下文可见的 NODE_OPTIONS，优先兼容 Vitest worker 注入形态。
 *
 * @returns 解析到的 NODE_OPTIONS 字符串；若不存在则为 `undefined`
 */
function resolveNodeOptions(): string | undefined {
  /* Vitest 4.0 将 NODE_OPTIONS 直接挂在 worker 的 metaEnv。 */
  const workerNodeOptions = (
    globalThis as {
      __vitest_worker__?: { metaEnv?: { NODE_OPTIONS?: unknown } }
    }
  ).__vitest_worker__?.metaEnv?.NODE_OPTIONS

  if (typeof workerNodeOptions === 'string' && workerNodeOptions.length > 0) {
    return workerNodeOptions
  }

  return undefined
}

/**
 * 判断 NODE_OPTIONS 是否包含调试相关标记。
 *
 * @param nodeOptions - 需要检查的 NODE_OPTIONS 字符串
 * @returns 存在调试关键字时返回 true
 */
function hasDebugFlag(nodeOptions: string): boolean {
  /* 通过关键字匹配覆盖 inspect/debug/debugConnector 等常见调试入口。 */
  return (
    nodeOptions.includes('inspect') ||
    nodeOptions.includes('debug') ||
    nodeOptions.includes('debugConnector')
  )
}

/**
 * 汇总 NODE_OPTIONS 调试判定逻辑，存在且包含调试关键字则返回 true。
 *
 * @returns 是否检测到调试相关配置
 */
function hasNodeDebugFlag(): boolean {
  /* 读取 NODE_OPTIONS 判定是否启用 inspect/debug 相关参数。 */
  const nodeOptions = resolveNodeOptions()

  /* 未提供 NODE_OPTIONS 直接视为未启用调试。 */
  if (!nodeOptions) {
    return false
  }

  /* WebStorm/VS Code 均会在 NODE_OPTIONS 中携带调试关键字，这里统一匹配。 */
  return hasDebugFlag(nodeOptions)
}

/**
 * 在开发模式下判断是否启用了调试能力（inspect/IDE 连接器等）。
 *
 * @returns 若当前运行环境处于开发模式且开启调试则为 true
 */
export function isDevDebugEnvironment(): boolean {
  /* 非开发模式直接短路，避免生产环境误触调试逻辑。 */
  if (!__DEV__) {
    return false
  }

  /* 浏览器端 Vitest inspector 通过 runner 配置标识调试状态。 */
  if (isVitestBrowserInspectActive()) {
    return true
  }

  return hasNodeDebugFlag()
}
