import type { ComponentInstance } from './context.ts'
import { setCurrentInstance, unsetCurrentInstance } from './context.ts'
import type { RenderFunction, SetupComponent } from '@/jsx-foundation/index.ts'
import {
  runtimeCoreAsyncSetupNotSupported,
  runtimeCoreSetupMustReturnRender,
} from '@/messages/index.ts'
import type {
  DevtoolsSetupStateCollector,
  DevtoolsSetupStateKind,
  PlainObject,
} from '@/shared/index.ts'
import {
  __DEV__,
  errorContexts,
  errorPhases,
  isThenable,
  runSilent,
  withDevtoolsSetupStateCollector,
} from '@/shared/index.ts'

function createDevtoolsSetupStateCollector(instance: unknown): DevtoolsSetupStateCollector {
  const counters: Record<DevtoolsSetupStateKind, number> = {
    computed: 0,
    reactive: 0,
    ref: 0,
    unknown: 0,
  }

  const recorded = new WeakSet()

  return {
    collect(value, kind) {
      if (!value || typeof value !== 'object') {
        return
      }

      if (recorded.has(value)) {
        return
      }

      recorded.add(value)

      const devtoolsInstance = instance as {
        setupState?: PlainObject
        devtoolsRawSetupState?: PlainObject
      }

      devtoolsInstance.setupState ??= {}
      devtoolsInstance.devtoolsRawSetupState ??= {}

      const index = counters[kind]++
      const key = `${kind}${index}`

      devtoolsInstance.setupState[key] = value
      devtoolsInstance.devtoolsRawSetupState[key] = value
    },
  }
}

/**
 * 初始化组件，创建 `setup` 阶段与渲染闭包。
 *
 * @remarks
 * - `setup` 返回的渲染闭包会成为 `effect` 调度的核心逻辑。
 * - `setup` 失败或返回空值时跳过后续挂载，由上层处理清理。
 *
 * @returns `true` 表示 `setup` 成功，`false` 表示失败。
 */
export function setupComponent<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): boolean {
  /* `setup` 返回的渲染闭包会成为 `effect` 调度的核心逻辑。 */
  const render = invokeSetup(instance)

  if (!render) {
    /* `setup` 失败或返回空值时跳过后续挂载。 */
    return false
  }

  instance.render = render

  return true
}

/**
 * 安全运行组件 `setup`：挂载当前实例上下文，收集错误并校验返回值。
 *
 * @remarks
 * - 在组件专属 `scope` 内运行 `setup`，便于后续统一 `stop`。
 * - 替换全局 `currentInstance` 以便 `setup` 内部通过 API 访问自身。
 * - 校验返回值：必须是函数，不支持异步 `setup`。
 */
function invokeSetup<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): RenderFunction | undefined {
  let setupFailed = false
  const devtoolsSetupStateCollector = __DEV__
    ? createDevtoolsSetupStateCollector(instance)
    : undefined

  /* 在组件专属 `scope` 内运行 `setup`，便于后续统一 `stop`。 */
  const render = instance.scope.run(() => {
    return runSilent(
      () => {
        if (__DEV__ && devtoolsSetupStateCollector) {
          return withDevtoolsSetupStateCollector(devtoolsSetupStateCollector, () => {
            return instance.type(instance.props)
          })
        }

        return instance.type(instance.props)
      },
      {
        origin: errorContexts.componentSetup,
        handlerPhase: errorPhases.sync,
        beforeRun() {
          /* 替换全局 `currentInstance` 以便 `setup` 内部通过 `API` 访问自身。 */
          setCurrentInstance(instance)
        },
        afterRun(token) {
          unsetCurrentInstance()

          if (token?.error) {
            setupFailed = true
          }
        },
      },
    )
  })

  if (setupFailed || !render) {
    /* `setup` 抛错或返回空值时静默失败，交给上层跳过挂载。 */
    return undefined
  }

  if (isThenable(render)) {
    /* Mini-vue `runtime-core` 目前仅支持同步 `setup`：返回 `Promise` 会导致挂载行为不可预测。 */
    runSilent(
      () => {
        throw new TypeError(runtimeCoreAsyncSetupNotSupported, {
          cause: render,
        })
      },
      {
        origin: errorContexts.componentSetup,
        handlerPhase: errorPhases.sync,
      },
    )

    return undefined
  }

  if (typeof render !== 'function') {
    /* `setup` 必须返回函数，非函数时透过错误通道上报。 */
    runSilent(
      () => {
        throw new TypeError(runtimeCoreSetupMustReturnRender, { cause: render })
      },
      {
        origin: errorContexts.componentSetup,
        handlerPhase: errorPhases.sync,
      },
    )

    return undefined
  }

  /* 始终返回函数，供 `effect` 每次执行时拿到最新子树。 */
  return render
}
