import type { RendererOptions } from '../index.ts'
import type { MountedHandle } from '../mount/handle.ts'
import { normalizeRenderOutput } from '../normalize.ts'
import { patchChild } from '../patch/index.ts'
import { asRuntimeVNode } from '../vnode.ts'
import { mountChildWithAnchor } from './anchor.ts'
import type { ComponentInstance } from './context.ts'
import { teardownComponentInstance } from './teardown.ts'
import type { SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'
import { ReactiveEffect, recordEffectScope } from '@/reactivity/index.ts'
import { errorContexts, errorPhases, runSilent } from '@/shared/index.ts'

/**
 * 运行组件 effect 并将首个结果挂载到容器。
 */
export function performInitialRender<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): MountedHandle<HostNode> {
  /* 每个组件实例持有独立 effect，负责跟踪依赖并调度重渲染。 */
  instance.effect = createRenderEffect(options, instance)

  let mounted: MountedHandle<HostNode> | undefined
  let ok = true

  /* 首次 run() 会同步生成子树结果。 */
  /* 包裹错误通道：首渲染异常需清理实例但不中断兄弟挂载。 */
  runSilent(
    () => {
      const subtree = instance.effect!.run()

      /* 子树由通用 mountChild 继续挂载到宿主容器。 */
      mounted = mountChildWithAnchor(options, instance, subtree)

      instance.mountedHandle = mounted

      ok &&= mounted?.ok ?? true
    },
    {
      origin: errorContexts.effectRunner,
      handlerPhase: errorPhases.sync,
      /* 与 Vue 类似：首渲染错误上报但不中断兄弟挂载。 */
      afterRun(token) {
        if (token?.error) {
          ok = false
          teardownComponentInstance(options, instance)
        }
      },
    },
  )

  return {
    ok,
    nodes: mounted?.nodes ?? [],
    teardown(skipRemove?: boolean): void {
      mounted?.teardown(skipRemove)
    },
  }
}

function createRenderEffect<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): ReactiveEffect<VirtualNode | undefined> {
  const effect = new ReactiveEffect<VirtualNode | undefined>(
    () => {
      /* 每次渲染时记录最新子树，供后续挂载或复用。 */
      const subtree = normalizeRenderOutput(instance.render())

      instance.subTree = subtree

      return subtree
    },
    (renderSchedulerJob) => {
      /* 调度阶段尝试生成新子树，成功后再替换旧挂载。 */
      rerenderComponent(options, instance, renderSchedulerJob)
    },
  )

  recordEffectScope(effect, instance.scope)

  return effect
}

/**
 * Rerender 时先尝试生成新子树，成功后再替换旧挂载，失败则保留旧子树。
 */
function rerenderComponent<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  renderSchedulerJob: () => void,
): void {
  const previousSubTree = instance.subTree
  let rerenderFailed = false

  /* 调度执行由 effect 决定，异常时标记失败并避免替换旧子树。 */
  runSilent(renderSchedulerJob, {
    origin: errorContexts.scheduler,
    handlerPhase: errorPhases.sync,
    afterRun(token) {
      if (token?.error) {
        rerenderFailed = true
      }
    },
  })

  if (rerenderFailed) {
    instance.subTree = previousSubTree

    return
  }

  patchLatestSubtree(options, instance, previousSubTree)
}

/**
 * 以 patch 方式更新组件子树，保持宿主节点复用。
 */
function patchLatestSubtree<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  previousSubTree: VirtualNode | undefined,
): void {
  patchChild(options, previousSubTree, instance.subTree, {
    container: instance.container,
    anchor: instance.anchor,
    context: {
      parent: instance,
      appContext: instance.appContext,
    },
  })

  if (instance.subTree) {
    instance.mountedHandle = asRuntimeVNode<HostNode, HostElement, HostFragment>(
      instance.subTree,
    ).handle
  } else {
    instance.mountedHandle = undefined
  }
}
