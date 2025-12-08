import type { RendererOptions } from '../index.ts'
import type { MountedHandle } from '../mount/handle.ts'
import type { ComponentInstance } from './context.ts'
import { teardownComponentInstance, teardownMountedSubtree } from './teardown.ts'
import { mountChildWithAnchor } from './anchor.ts'
import type { ComponentResult, SetupFunctionComponent } from '@/jsx-foundation'
import { ReactiveEffect } from '@/reactivity/effect.ts'
import { recordEffectScope } from '@/reactivity/effect-scope.ts'
import {
  runtimeErrorContexts,
  errorHandlerPhases,
  errorPropagationStrategies,
  runWithErrorChannel,
} from '@/shared'

/**
 * 运行组件 effect 并将首个结果挂载到容器。
 */
export function performInitialRender<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): MountedHandle<HostNode> | undefined {
  /* 每个组件实例持有独立 effect，负责跟踪依赖并调度重渲染。 */
  instance.effect = createRenderEffect(options, instance)

  /* 首次 run() 会同步生成子树结果。 */
  /* 包裹错误通道：首渲染异常需清理实例但不中断兄弟挂载。 */
  return runWithErrorChannel(
    () => {
      const subtree = instance.effect!.run()
      /* 子树由通用 mountChild 继续挂载到宿主容器。 */
      const mounted = mountChildWithAnchor(options, instance, subtree)

      instance.mountedHandle = mounted

      return mounted
    },
    {
      origin: runtimeErrorContexts.effectRunner,
      handlerPhase: errorHandlerPhases.sync,
      /* 与 Vue 类似：首渲染错误上报但不中断兄弟挂载。 */
      propagate: errorPropagationStrategies.silent,
      afterRun(token) {
        if (token?.error) {
          teardownComponentInstance(options, instance)
        }
      },
    },
  )
}

function createRenderEffect<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): ReactiveEffect<ComponentResult> {
  const effect = new ReactiveEffect<ComponentResult>(
    () => {
      /* 每次渲染时记录最新子树，供后续挂载或复用。 */
      const subtree = instance.render()

      instance.subTree = subtree

      return subtree
    },
    (renderSchedulerJob) => {
      /* 调度阶段需要先卸载旧子树，再执行 render 并挂载。 */
      rerenderComponent(options, instance, renderSchedulerJob)
    },
  )

  recordEffectScope(effect, instance.scope)

  return effect
}

/**
 * Rerender 时先卸载旧子树，再运行调度任务并重新挂载新子树。
 */
function rerenderComponent<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  renderSchedulerJob: () => void,
): void {
  /* 依次保证 teardown → renderSchedulerJob → remount 的同步顺序。 */
  teardownMountedSubtree(instance)
  let rerenderFailed = false

  /* 调度执行由 effect 决定，异常时标记失败并避免重新挂载。 */
  runWithErrorChannel(renderSchedulerJob, {
    origin: runtimeErrorContexts.scheduler,
    handlerPhase: errorHandlerPhases.sync,
    propagate: errorPropagationStrategies.silent,
    afterRun(token) {
      if (token?.error) {
        rerenderFailed = true
      }
    },
  })

  /* 调度失败时整棵组件树已经不可用，直接执行完整清理。 */
  if (rerenderFailed) {
    teardownComponentInstance(options, instance)

    return
  }

  mountLatestSubtree(options, instance)
}

/**
 * 将最新的子树结果重新挂载回容器并记录。
 */
function mountLatestSubtree<
  HostNode,
  HostElement extends HostNode,
  HostFragment extends HostNode,
  T extends SetupFunctionComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): void {
  /* 使用缓存的子树结果重新交给宿主挂载。 */
  const mounted = mountChildWithAnchor(options, instance, instance.subTree)

  instance.mountedHandle = mounted
}
