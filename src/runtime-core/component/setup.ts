/**
 * 组件 `setup` 执行与 Devtools 收集适配，产出渲染闭包并校验返回值。
 * 负责 currentInstance 切换、Devtools setupState 收集与同步 `setup` 返回值校验。
 * 仅支持同步 `setup`，异常通过错误通道上报，留给上层决定是否跳过挂载。
 */
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

/* eslint-disable @typescript-eslint/no-restricted-types -- Devtools 收集需使用宽泛对象键以兼容各类 setup 返回值 */

/**
 * 创建 Devtools 使用的 setup state 收集器，统计响应式值并提供命名修正。
 */
function createDevtoolsSetupStateCollector(instance: unknown): DevtoolsSetupStateCollector {
  const counters: Record<DevtoolsSetupStateKind, number> = {
    computed: 0,
    reactive: 0,
    ref: 0,
    unknown: 0,
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
  const recorded = new WeakSet<object>()
  const named = new WeakMap<object, string>()
  const valueToKey = new WeakMap<object, string>()

  /**
   * 确保实例上存在 Devtools 读取的 `setupState` 与 `devtoolsRawSetupState`。
   */
  const resolveDevtoolsRawSetupState = (): Record<string, unknown> => {
    const devtoolsInstance = instance as {
      setupState?: PlainObject
      devtoolsRawSetupState?: PlainObject
    }

    devtoolsInstance.devtoolsRawSetupState ??= {}

    /*
     * `setupState` 可能在实例创建时被 Devtools 适配层替换为 proxyRefs 版本；
     * 这里仅在缺失时兜底，避免收集逻辑在非标准路径下失效。
     */
    devtoolsInstance.setupState ??= devtoolsInstance.devtoolsRawSetupState

    return devtoolsInstance.devtoolsRawSetupState as Record<string, unknown>
  }

  /**
   * 为 Devtools 收集到的值生成唯一 key，避免名称冲突。
   */
  const resolveUniqueKey = (parameters: {
    state: Record<string, unknown>
    base: string
    value: object
  }): string => {
    const { state, base, value } = parameters

    if (!Object.hasOwn(state, base) || state[base] === value) {
      return base
    }

    for (let index = 1; ; index += 1) {
      const candidate = `${base}$${index}`

      if (!Object.hasOwn(state, candidate) || state[candidate] === value) {
        return candidate
      }
    }
  }

  return {
    collect(value, kind) {
      if (!value || typeof value !== 'object') {
        return
      }

      if (recorded.has(value)) {
        return
      }

      recorded.add(value)

      const state = resolveDevtoolsRawSetupState()
      const index = counters[kind]++
      const unnamedKey = `${kind}${index}`
      const preferredKey = named.get(value) ?? unnamedKey
      const resolvedKey = resolveUniqueKey({ state, base: preferredKey, value })

      state[resolvedKey] = value
      valueToKey.set(value, resolvedKey)
    },
    registerName(value, name) {
      if (!value || typeof value !== 'object') {
        return
      }

      if (!name) {
        return
      }

      named.set(value, name)

      const existingKey = valueToKey.get(value)

      if (!existingKey) {
        return
      }

      const state = resolveDevtoolsRawSetupState()
      const nextKey = resolveUniqueKey({ state, base: name, value })

      if (nextKey === existingKey) {
        return
      }

      state[nextKey] = value

      if (state[existingKey] === value) {
        Reflect.deleteProperty(state, existingKey)
      }

      valueToKey.set(value, nextKey)
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

/* eslint-enable @typescript-eslint/no-restricted-types */
