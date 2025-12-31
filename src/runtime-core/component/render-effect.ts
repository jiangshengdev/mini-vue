import type { RendererOptions } from '../index.ts'
import type { MountedHandle } from '../mount/handle.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import { normalizeRenderOutput } from '../normalize.ts'
import { mountChildInEnvironment, patchChild } from '../patch/index.ts'
import { getFirstHostNode, getLastHostNode, getNextHostNode } from '../patch/utils.ts'
import type { SchedulerJob } from '../scheduler.ts'
import { queueSchedulerJob } from '../scheduler.ts'
import { asRuntimeVirtualNode } from '../virtual-node.ts'
import type { ComponentInstance } from './context.ts'
import { emitDevtoolsComponentAdded, emitDevtoolsComponentUpdated } from './devtools.ts'
import {
  invokeBeforeUpdateHooks,
  markComponentMounted,
  queueMountedHooks,
  queueUpdatedHooks,
} from './lifecycle.ts'
import { teardownComponentInstance } from './teardown.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'
import { ReactiveEffect, recordEffectScope } from '@/reactivity/index.ts'
import { errorContexts, errorPhases, runSilent } from '@/shared/index.ts'

/**
 * 运行组件 `effect` 并将首个结果挂载到容器。
 *
 * @remarks
 * - 首次 `run()` 会同步生成子树结果并挂载到宿主容器。
 * - 首渲染异常会通过错误通道上报，但不中断兄弟组件的挂载。
 */
export function performInitialRender<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  anchor?: HostNode,
): MountedHandle<HostNode> {
  /* 每个组件实例持有独立 `effect`，负责跟踪依赖并调度重渲染。 */
  instance.effect = createRenderEffect(options, instance)

  let mounted: MountedHandle<HostNode> | undefined
  let ok = true

  /* 首次 `run()` 会同步生成子树结果。 */
  /* 包裹错误通道：首渲染异常需清理实例但不中断兄弟挂载。 */
  runSilent(
    () => {
      const subtree = instance.effect!.run()

      /* 子树由通用 `mountChild` 继续挂载到宿主容器。 */
      mounted = mountChildInEnvironment(options, subtree, {
        container: instance.container,
        anchor,
        context: {
          parent: instance,
          appContext: instance.appContext,
        },
      })

      instance.mountedHandle = mounted

      ok &&= mounted?.ok ?? true

      if (ok && mounted) {
        instance.isMounted = true
        markComponentMounted(instance)
        queueMountedHooks(instance)
        emitDevtoolsComponentAdded(instance)
      }
    },
    {
      origin: errorContexts.effectRunner,
      handlerPhase: errorPhases.sync,
      /* 与 Vue 类似：首渲染错误上报但不中断兄弟挂载。 */
      afterRun(token) {
        if (token?.error) {
          ok = false
          teardownComponentInstance(instance)
        }
      },
    },
  )

  return {
    ok,
    nodes: mounted?.nodes ?? [],
    /** 首渲染返回句柄的清理方法：转调子树的 `teardown`，便于上层统一回收。 */
    teardown(skipRemove?: boolean): void {
      mounted?.teardown(skipRemove)
    },
  }
}

/**
 * 创建组件渲染用的响应式 `effect`，负责产出子树并在依赖变更时调度更新。
 *
 * @remarks
 * - `effect` 的 `fn` 每次执行都会调用 `render()` 获取最新子树。
 * - `scheduler` 负责将更新任务提交给调度器，由调度器决定合并与执行时机。
 */
function createRenderEffect<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
): ReactiveEffect<NormalizedVirtualNode | undefined> {
  /* 缓存调度器提供的「本轮 render job」，用于合并多次依赖触发。 */
  let pendingRenderJob: (() => void) | undefined

  /* 组件更新调度入口：取出本轮 job 并驱动一次 rerender。 */
  const componentUpdateJob: SchedulerJob = () => {
    const job = pendingRenderJob

    pendingRenderJob = undefined

    /* 组件已卸载或缺少 runner 时无需继续执行。 */
    if (!job || !instance.effect?.active) {
      return
    }

    rerenderComponent(options, instance, job)
  }

  /* 对齐 Vue3：组件更新任务按 uid 排序，保证父组件先于子组件执行。 */
  componentUpdateJob.id = instance.uid

  const effect = new ReactiveEffect<NormalizedVirtualNode | undefined>(
    /* 渲染 runner：执行 `render()` 并缓存最新 `subTree`，供后续 `patch`/移动同步使用。 */
    () => {
      /* 每次渲染时记录最新子树，供后续挂载或复用。 */
      const subtree = normalizeRenderOutput(instance.render())

      instance.subTree = subtree

      return subtree
    },
    /* 调度器回调：保存本轮 job，并提交到全局 scheduler 以合并执行。 */
    (renderSchedulerJob) => {
      pendingRenderJob = renderSchedulerJob
      queueSchedulerJob(componentUpdateJob)
    },
  )

  recordEffectScope(effect, instance.scope)

  return effect
}

/**
 * Rerender 时先尝试生成新子树，成功后再替换旧挂载，失败则保留旧子树。
 *
 * @remarks
 * - 调度执行由 `effect` 决定，异常时标记失败并避免替换旧子树。
 * - 这种「失败回滚」策略可防止渲染错误导致整棵子树丢失。
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

  /* 调度执行由 `effect` 决定，异常时标记失败并避免替换旧子树。 */
  runSilent(renderSchedulerJob, {
    origin: errorContexts.scheduler,
    handlerPhase: errorPhases.async,
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

  invokeBeforeUpdateHooks(instance)

  patchLatestSubtree(options, instance, previousSubTree)

  emitDevtoolsComponentUpdated(instance)

  queueUpdatedHooks(instance)
}

/**
 * 以 `patch` 方式更新组件子树，保持宿主节点复用。
 *
 * @remarks
 * - `patch` 会对比新旧子树，仅更新变更部分，避免整棵重建。
 * - 更新后同步 `mountedHandle`，确保后续 `teardown` 能正确清理。
 */
function patchLatestSubtree<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  previousSubTree: NormalizedVirtualNode | undefined,
): void {
  /*
   * 组件更新的插入锚点应来自「旧子树之后的下一个宿主节点」：
   * - 对齐 Vue3：`getNextHostNode(prevSubTree)`。
   */
  const insertionAnchor = previousSubTree ? getNextHostNode(options, previousSubTree) : undefined

  patchChild(options, previousSubTree, instance.subTree, {
    container: instance.container,
    anchor: insertionAnchor,
    context: {
      parent: instance,
      appContext: instance.appContext,
    },
  })

  if (instance.subTree) {
    instance.mountedHandle = asRuntimeVirtualNode<HostNode, HostElement, HostFragment>(
      instance.subTree,
    ).handle
  } else {
    instance.mountedHandle = undefined
  }

  /* 子树 patch 结束后同步组件 vnode 的宿主引用：对齐 Vue3（组件范围来源于 subTree）。 */
  syncComponentVirtualNodeHost(instance)
}

/**
 * 将组件 `virtualNode` 的宿主范围同步为最新 `subTree` 的范围。
 *
 * @remarks
 * - Vue3 语义：组件 vnode 的 `el/anchor` 来源于其 `subTree`。
 * - 当 `subTree` 不存在时（仅可能来自不合法输出），保守清空宿主引用。
 */
function syncComponentVirtualNodeHost<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>): void {
  const runtime = instance.virtualNode

  if (!runtime) {
    return
  }

  const { subTree } = instance

  if (!subTree) {
    runtime.el = undefined
    runtime.anchor = undefined

    return
  }

  runtime.el = getFirstHostNode<HostNode>(subTree)
  runtime.anchor = getLastHostNode<HostNode>(subTree)
}
