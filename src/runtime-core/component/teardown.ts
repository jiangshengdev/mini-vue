/**
 * 组件卸载流程：移除子树、停止副作用并通知生命周期/Devtools。
 */
import type { ComponentInstance } from './context.ts'
import { emitDevtoolsComponentRemoved } from './devtools.ts'
import { invalidateLifecyclePostJobs, queueUnmountedHooks } from './lifecycle.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'
import { errorContexts, errorPhases, runSilent } from '@/shared/index.ts'

/**
 * 移除当前缓存的宿主节点，防止重复保留旧 DOM。
 *
 * @remarks
 * - 无挂载记录时无需额外清理，直接返回。
 * - 释放宿主节点引用后，旧 DOM 会被宿主实现回收。
 */
export function teardownMountedSubtree<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>, skipRemove?: boolean): void {
  /* 无挂载记录时无需额外清理，直接返回。 */
  if (!instance.mountedHandle) {
    return
  }

  /* 释放宿主节点引用，旧 `DOM` 会被宿主实现回收。 */
  instance.mountedHandle.teardown(skipRemove)
  instance.mountedHandle = undefined
}

/**
 * 释放组件实例，确保子树、`effect` 与自定义清理任务全部执行。
 *
 * @remarks
 * 清理顺序：
 * 1. 卸载已挂载的子树（`mountedHandle.teardown`）。
 * 2. 停止 `scope` 以回收所有 `setup` 内创建的副作用。
 * 3. 执行外部注册的清理任务（`cleanupTasks`）。
 */
export function teardownComponentInstance<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(instance: ComponentInstance<HostNode, HostElement, HostFragment, T>, skipRemove?: boolean): void {
  if (instance.isUnmounted) {
    return
  }

  instance.isUnmounted = true
  instance.isDeactivated = false
  invalidateLifecyclePostJobs(instance)
  teardownMountedSubtree(instance, skipRemove)

  /* 停止 `scope` 以统一回收所有 `setup` 内创建的副作用。 */
  instance.scope.stop()
  instance.effect = undefined

  if (instance.cleanupTasks.length > 0) {
    /* 复制任务队列，避免执行过程中新增清理项造成死循环。 */
    const tasks = [...instance.cleanupTasks]

    instance.cleanupTasks = []

    /* 逐一运行外部注册的清理逻辑，避免引用泄漏。 */
    for (const task of tasks) {
      runSilent(task, {
        origin: errorContexts.componentCleanup,
        handlerPhase: errorPhases.sync,
      })
    }
  }

  emitDevtoolsComponentRemoved(instance)
  queueUnmountedHooks(instance)
}
