/**
 * 依据 Vite 注入的 `import.meta.env` 判断当前是否处于开发模式。
 */
export function isDevEnvironment(): boolean {
  /* Vite 在构建期注入 import.meta.env，这里先取出作为环境判定的主来源。 */
  const metaEnv = import.meta.env

  /* Vite 提供最可靠的 DEV 标志，存在即可直接返回。 */
  if (typeof metaEnv?.DEV === 'boolean') {
    return metaEnv.DEV
  }

  /* PROD 只在 build 阶段为 true，可作为 DEV 的反向兜底。 */
  if (typeof metaEnv?.PROD === 'boolean') {
    return !metaEnv.PROD
  }

  /* 最后回退到 mode 字符串，约定非 production 即为开发语义。 */
  if (typeof metaEnv?.MODE === 'string') {
    return metaEnv.MODE !== 'production'
  }

  /* 默认以开发模式处理，方便在缺乏构建信息时暴露告警。 */
  return true
}

/**
 * 检测 Vitest 浏览器运行器是否开启 inspect-brk 调试。
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
 */
export function isDevDebugEnvironment(): boolean {
  /* 非开发模式直接短路，避免生产环境误触调试逻辑。 */
  if (!isDevEnvironment()) {
    return false
  }

  /* 浏览器端 Vitest inspector 通过 runner 配置标识调试状态。 */
  if (isVitestBrowserInspectActive()) {
    return true
  }

  return hasNodeDebugFlag()
}
