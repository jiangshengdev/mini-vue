import type { ComponentInstance } from './context.ts'
import { setCurrentInstance, unsetCurrentInstance } from './context.ts'
import type { ComponentRenderFunction, SetupFunctionComponent } from '@/jsx-foundation/index.ts'
import {
  runtimeErrorContexts,
  errorHandlerPhases,
  errorPropagationStrategies,
  runWithErrorChannel,
} from '@/shared/index.ts'

/**
 * 初始化组件，创建 setup 阶段与渲染闭包。
 */
export function setupComponent<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): boolean {
  /* `setup` 返回的渲染闭包会成为 effect 调度的核心逻辑。 */
  const render = invokeSetup(instance)

  if (!render) {
    /* `setup` 失败或返回空值时跳过后续挂载。 */
    return false
  }

  instance.render = render

  return true
}

function invokeSetup<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): ComponentRenderFunction | undefined {
  let setupFailed = false

  /* 在组件专属 scope 内运行 setup，便于后续统一 stop。 */
  const render = instance.scope.run(() => {
    return runWithErrorChannel(
      () => {
        return instance.type(instance.props)
      },
      {
        origin: runtimeErrorContexts.componentSetup,
        handlerPhase: errorHandlerPhases.sync,
        propagate: errorPropagationStrategies.silent,
        beforeRun() {
          /* 替换全局 currentInstance 以便 setup 内部通过 API 访问自身。 */
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

  if (typeof render !== 'function') {
    /* `setup` 必须返回函数，非函数时透过错误通道上报。 */
    runWithErrorChannel(
      () => {
        throw new TypeError('组件必须返回渲染函数以托管本地状态', { cause: render })
      },
      {
        origin: runtimeErrorContexts.componentSetup,
        handlerPhase: errorHandlerPhases.sync,
        propagate: errorPropagationStrategies.silent,
      },
    )

    return undefined
  }

  /* 始终返回函数，供 effect 每次执行时拿到最新子树。 */
  return render
}
