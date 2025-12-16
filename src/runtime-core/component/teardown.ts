import type { RendererOptions } from '../index.ts'
import type { ComponentInstance } from './context.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'
import { errorContexts, errorPhases, runSilent } from '@/shared/index.ts'

/**
 * 移除当前缓存的宿主节点，防止重复保留旧 DOM。
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

  /* 释放宿主节点引用，旧 DOM 会被宿主实现回收。 */
  instance.mountedHandle.teardown(skipRemove)
  instance.mountedHandle = undefined
}

/**
 * 释放组件实例，确保子树、 effect 与自定义清理任务全部执行。
 */
export function teardownComponentInstance<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
  T extends SetupComponent,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  instance: ComponentInstance<HostNode, HostElement, HostFragment, T>,
  skipRemove?: boolean,
): void {
  teardownMountedSubtree(instance, skipRemove)

  /* 去除锚点占位符，避免容器残留空文本节点。 */
  if (instance.anchor) {
    if (!skipRemove) {
      options.remove(instance.anchor)
    }

    instance.anchor = undefined
  }

  /* 停止 scope 以统一回收所有 setup 内创建的副作用。 */
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
}
